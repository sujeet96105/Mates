// firebase.ts - Firebase initialization with Auth and Firestore
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator, enableNetwork, disableNetwork, setLogLevel } from "firebase/firestore";
import { collection, addDoc, serverTimestamp, onSnapshot, getDocs, doc, deleteDoc, query, where, writeBatch, DocumentReference } from "firebase/firestore";
import { configureFirestoreForReactNative, FirestoreNetworkManager } from "./firestore-config";
import {
  initializeAuth,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  getReactNativePersistence,
  deleteUser
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhkgmgkSTNmFQXfMfQcl6ShA7qJkvRtiI",
  authDomain: "mates-ffbb1.firebaseapp.com",
  projectId: "mates-ffbb1",
  storageBucket: "mates-ffbb1.firebasestorage.app",
  messagingSenderId: "952108330206",
  appId: "1:952108330206:android:bb28b2f29e40d628d0e64f"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: ReturnType<typeof initializeAuth>;
let firestoreNetworkManager: FirestoreNetworkManager;

// Ensure initializeAuth is called only once across Fast Refresh
declare const global: any;
if (typeof global !== 'undefined' && global.__FIREBASE_AUTH__ === undefined) {
  global.__FIREBASE_AUTH__ = null;
}

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully");
  } else {
    app = getApps()[0];
    console.log("Using existing Firebase app instance");
  }

  // ✅ Auth with AsyncStorage persistence (idempotent)
  if (global.__FIREBASE_AUTH__) {
    auth = global.__FIREBASE_AUTH__;
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (e) {
      // If already initialized, fall back to retrieving existing instance
      auth = getAuth(app);
    }
    global.__FIREBASE_AUTH__ = auth;
  }
  console.log("Firebase Auth initialized with AsyncStorage persistence");

  // Firestore with React Native configuration (idempotent, prefer long polling)
  // Keep a single Firestore instance; prefer initializeFirestore for RN
  if (typeof global !== 'undefined' && global.__FIRESTORE__) {
    db = global.__FIRESTORE__ as Firestore;
  } else {
    db = initializeFirestore(app, {
      // Auto-detect long polling to avoid WebChannel issues on some Android devices/emulators
      experimentalAutoDetectLongPolling: true
    });
    if (typeof global !== 'undefined') global.__FIRESTORE__ = db;
  }

  // Configure Firestore for React Native to prevent WebChannel errors
  const cleanupErrorHandling = configureFirestoreForReactNative(db);
  // Reduce Firestore SDK log noise to only errors
  try { setLogLevel('error'); } catch {}
  
  // Initialize network manager
  firestoreNetworkManager = new FirestoreNetworkManager(db);
  
  console.log("Firestore initialized successfully with React Native configuration");
} catch (error) {
  console.error("Firebase initialization error:", (error as Error).message);
  throw error;
}

// ----------------------
// Network retry helpers for Auth
// ----------------------
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

const withAuthNetworkRetry = async <T>(op: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (e: any) {
      lastErr = e;
      const code = e?.code || e?.message || '';
      const isNetwork = code === 'auth/network-request-failed' || /network/i.test(String(code));
      if (!isNetwork) throw e;
      // Exponential backoff: 400ms, 800ms, 1200ms
      await sleep(400 * (i + 1));
    }
  }
  // Enhance message for UI
  if (lastErr?.code === 'auth/network-request-failed') {
    lastErr.message = 'Network error. Please check your internet connection and try again.';
  }
  throw lastErr;
};

// ----------------------
// Firestore helpers
// ----------------------
const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log("Firestore network enabled");
  } catch (error) {
    console.error("Error enabling Firestore network:", error);
  }
};

// ----------------------
// Trip-based expense helpers (users/{userId}/trips/{tripId}/expenses)
// ----------------------
type TripExpense = {
  amount: number;
  category: string;
  description: string;
  paidBy: string;
};

const addTripExpense = async (userId: string, tripId: string, expense: TripExpense) => {
  const expenseRef = collection(db, 'users', userId, 'trips', tripId, 'expenses');
  const docRef = await addDoc(expenseRef, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

const subscribeToTripExpenses = (
  userId: string,
  tripId: string,
  callback: (expenses: any[]) => void
) => {
  const expenseRef = collection(db, 'users', userId, 'trips', tripId, 'expenses');
  const unsubscribe = onSnapshot(
    expenseRef,
    (snapshot) => {
      const expenses: any[] = [];
      snapshot.forEach((docSnapshot) => {
        expenses.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      callback(expenses);
    },
    (error) => {
      console.warn('Firestore snapshot error (expenses):', error?.message || error);
    }
  );
  return unsubscribe;
};

const getTripTotalExpenses = async (userId: string, tripId: string) => {
  const expenseRef = collection(db, 'users', userId, 'trips', tripId, 'expenses');
  const snapshot = await getDocs(expenseRef);
  let total = 0;
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data() as any;
    total += Number(data.amount) || 0;
  });
  return total;
};

const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log("Firestore network disabled");
  } catch (error) {
    console.error("Error disabling Firestore network:", error);
  }
};

// ----------------------
// Authentication helpers
// ----------------------
const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<User | null> => {
  if (!auth) throw new Error("Auth not initialized");
  
  try {
    const userCredential = await withAuthNetworkRetry(() => createUserWithEmailAndPassword(auth, email, password));
    
    if (userCredential.user) {
      // Update user profile with display name
      try {
        await updateProfile(userCredential.user, { displayName });
      } catch (profileError: any) {
        console.error("Failed to update user profile:", profileError?.message || profileError);
        // Continue even if profile update fails
      }
      
      // Send verification email automatically after registration
      let verificationEmailSent = false;
      let verificationError: any = null;
      
      try {
        await sendEmailVerification(userCredential.user);
        verificationEmailSent = true;
        console.log("Registration successful and verification email sent");
      } catch (e: any) {
        verificationError = e;
        console.error("Registration successful but verification email failed:", verificationError?.message || verificationError);
        // Log detailed error for debugging
        console.error("Verification email error details:", {
          code: verificationError?.code,
          message: verificationError?.message,
          email: userCredential.user.email
        });
      }
      
      // Enforce verification before app access: sign out immediately
      try {
        await firebaseSignOut(auth);
        console.log("User signed out after registration to enforce email verification");
      } catch (signOutError: any) {
        console.error("Sign out after registration failed:", signOutError?.message || signOutError);
        // This is critical - if sign out fails, user might be logged in without verification
        // Try to force sign out by clearing auth state
        try {
          await firebaseSignOut(auth);
        } catch (retryError: any) {
          console.error("Retry sign out also failed:", retryError?.message || retryError);
        }
      }
      
      // If verification email failed, throw an error so the UI can inform the user
      if (!verificationEmailSent) {
        const errorMsg = verificationError?.code === 'auth/too-many-requests'
          ? 'Account created successfully, but we couldn\'t send a verification email right now due to too many requests. Please wait a few minutes and check your email, or try signing in to resend the verification email.'
          : 'Account created successfully, but we couldn\'t send a verification email right now. Please try signing in to resend the verification email.';
        throw new Error(errorMsg);
      }
      
      // Return null so callers don't treat the user as logged in
      return null;
    }
    return null;
  } catch (error: any) {
    const code = error?.code;
    
    // If it's our custom verification email error, re-throw it
    if (error?.message?.includes('Account created successfully')) {
      throw error;
    }
    
    // Handle network errors
    if (code === 'auth/network-request-failed') {
      throw new Error('Network error during registration. Please connect to the internet and try again.');
    }
    
    // Log detailed error for debugging
    console.error("Registration error:", {
      code: code,
      message: error?.message || error,
      email: email
    });
    
    throw error;
  }
};

const loginUser = async (email: string, password: string): Promise<User | null> => {
  if (!auth) throw new Error("Auth not initialized");
  
  try {
    const userCredential = await withAuthNetworkRetry(() => signInWithEmailAndPassword(auth, email, password));
    const user = userCredential.user;
    
    if (user && !user.emailVerified) {
      let verificationEmailSent = false;
      let verificationError: any = null;
      
      // Try to send verification email
      try {
        await sendEmailVerification(user);
        verificationEmailSent = true;
        console.log("Verification email re-sent on unverified login");
      } catch (e: any) {
        verificationError = e;
        console.error("Failed resending verification email:", e?.message || e);
        // Log the full error for debugging
        console.error("Verification email error details:", {
          code: e?.code,
          message: e?.message,
          email: user.email
        });
      }
      
      // Sign out and reject login
      try {
        await firebaseSignOut(auth);
        console.log("User signed out after unverified login attempt");
      } catch (signOutError: any) {
        console.error("Sign out after unverified login failed:", signOutError?.message || signOutError);
      }
      
      // Provide accurate error message based on whether email was sent
      if (verificationEmailSent) {
        throw new Error("Please verify your email before logging in. We've sent you a verification link.");
      } else {
        // If email sending failed, provide a more helpful error message
        const errorMsg = verificationError?.code === 'auth/too-many-requests' 
          ? "Please verify your email before logging in. Too many verification emails sent. Please wait a few minutes and check your email, or try again later."
          : "Please verify your email before logging in. We couldn't send a verification email right now. Please check your email for a previous verification link, or try again in a few moments.";
        throw new Error(errorMsg);
      }
    }
    
    return user;
  } catch (error: any) {
    const code = error?.code;
    
    // If it's already our custom verification error, re-throw it
    if (error?.message?.includes('verify your email')) {
      throw error;
    }
    
    // Handle network errors
    if (code === 'auth/network-request-failed') {
      throw new Error('Network error during login. Please check your internet connection and try again.');
    }
    
    // Log the error for debugging
    console.error("Login error:", {
      code: code,
      message: error?.message || error,
      email: email
    });
    
    // Re-throw the original error
    throw error;
  }
};

const signOut = async () => {
  await firebaseSignOut(auth);
  return true;
};

const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
  return true;
};

const getCurrentUser = (): User | null => auth.currentUser;

const updateUserProfile = async (displayName?: string, photoURL?: string) => {
  const user = getCurrentUser();
  if (!user) throw new Error("No user is signed in");
  await updateProfile(user, { displayName, photoURL });
  return user;
};

const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ----------------------
// Email verification helpers
// ----------------------
const sendVerificationEmail = async () => {
  if (!auth) throw new Error("Auth not initialized");

  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  try {
    await sendEmailVerification(user);
    console.log("Verification email sent successfully");
    return true;
  } catch (error: any) {
    console.error("Email verification error:", error.message);
    throw error;
  }
};

const checkEmailVerification = (): boolean => {
  if (!auth?.currentUser) {
    console.warn("No user is signed in");
    return false;
  }
  
  const isVerified = auth.currentUser.emailVerified;
  console.log(`Email verification status: ${isVerified ? 'Verified ✅' : 'Not verified ❌'}`);
  return isVerified;
};

const refreshUserVerificationStatus = async (): Promise<boolean> => {
  if (!auth?.currentUser) {
    throw new Error("No user is signed in");
  }

  try {
    await auth.currentUser.reload();
    const isVerified = auth.currentUser.emailVerified;
    console.log(`Email verification status after reload: ${isVerified ? 'Verified ✅' : 'Not verified ❌'}`);
    return isVerified;
  } catch (error: any) {
    console.error("Error refreshing user verification status:", error.message);
    throw error;
  }
};

// ----------------------
// Account & Data Deletion helpers (Play Store compliance)
// ----------------------
// Recursively deletes all Firestore data owned by the user under users/{uid}/expenses
// and optionally the user root document (users/{uid}) if it exists. Client SDK doesn't
// have recursiveDelete, so we manually batch-delete by querying.
const deleteAllUserData = async (uid: string): Promise<void> => {
  const chunkSize = 400;
  let buffer: ReturnType<typeof writeBatch> = writeBatch(db);
  let opCount = 0;

  const flush = async () => {
    if (opCount > 0) {
      await buffer.commit();
      buffer = writeBatch(db);
      opCount = 0;
    }
  };

  // 1) users/{uid}/expenses
  try {
    const nestedExpensesCol = collection(db, 'users', uid, 'expenses');
    const nestedExpensesSnap = await getDocs(nestedExpensesCol);
    for (const docSnap of nestedExpensesSnap.docs) {
      buffer.delete(docSnap.ref);
      opCount++;
      if (opCount >= chunkSize) await flush();
    }
    await flush();
  } catch {}

  // 1b) users/{uid}/trips/*/expenses and delete trip docs too
  try {
    const tripsCol = collection(db, 'users', uid, 'trips');
    const tripsSnap = await getDocs(tripsCol);
    for (const tripDoc of tripsSnap.docs) {
      // Delete expenses under this trip
      const tripExpensesCol = collection(db, 'users', uid, 'trips', tripDoc.id, 'expenses');
      const tripExpensesSnap = await getDocs(tripExpensesCol);
      for (const e of tripExpensesSnap.docs) {
        buffer.delete(e.ref);
        opCount++;
        if (opCount >= chunkSize) await flush();
      }
      // Delete the trip document itself
      buffer.delete(tripDoc.ref);
      opCount++;
      if (opCount >= chunkSize) await flush();
    }
    await flush();
  } catch {}

  // 2) Top-level expenses where userId == uid
  try {
    const topExpensesQ = query(collection(db, 'expenses'), where('userId', '==', uid));
    const topExpensesSnap = await getDocs(topExpensesQ);
    for (const d of topExpensesSnap.docs) {
      buffer.delete(d.ref);
      opCount++;
      if (opCount >= chunkSize) await flush();
    }
    await flush();
  } catch {}

  // 3) Top-level sessions where userId == uid
  try {
    const sessionsQ = query(collection(db, 'sessions'), where('userId', '==', uid));
    const sessionsSnap = await getDocs(sessionsQ);
    for (const d of sessionsSnap.docs) {
      buffer.delete(d.ref);
      opCount++;
      if (opCount >= chunkSize) await flush();
    }
    await flush();
  } catch {}

  // 4) users/{uid}
  try {
    const userDocRef = doc(db, 'users', uid);
    buffer.delete(userDocRef);
    opCount++;
    await flush();
  } catch {}
};

// Deletes all Firestore data for the current user, then deletes the Firebase Auth account.
// If recent login is required, this will throw an error with code 'auth/requires-recent-login'.
const deleteAccountAndData = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  // 1) Delete Firestore data first (as required by Play Store)
  await deleteAllUserData(user.uid);

  // 2) Delete Auth account
  try {
    await deleteUser(user);
    return true;
  } catch (error: any) {
    // If re-auth is required, surface a clear message to UI
    if (error?.code === 'auth/requires-recent-login') {
      throw new Error('Recent login required. Please sign in again and retry account deletion.');
    }
    throw error;
  }
};

export {
  app,
  db,
  auth,
  firestoreNetworkManager,
  enableFirestoreNetwork,
  disableFirestoreNetwork,
  registerUser,
  loginUser,
  signOut,
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  subscribeToAuthChanges,
  sendVerificationEmail,
  checkEmailVerification,
  refreshUserVerificationStatus,
  addTripExpense,
  subscribeToTripExpenses,
  getTripTotalExpenses,
  deleteAllUserData,
  deleteAccountAndData
};
