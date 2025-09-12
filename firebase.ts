// firebase.ts - Firebase initialization with Auth and Firestore
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { collection, addDoc, serverTimestamp, onSnapshot, getDocs } from "firebase/firestore";
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
  getReactNativePersistence
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
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
    if (typeof global !== 'undefined') global.__FIRESTORE__ = db;
  }

  // Configure Firestore for React Native to prevent WebChannel errors
  const cleanupErrorHandling = configureFirestoreForReactNative(db);
  
  // Initialize network manager
  firestoreNetworkManager = new FirestoreNetworkManager(db);
  
  console.log("Firestore initialized successfully with React Native configuration");
} catch (error) {
  console.error("Firebase initialization error:", (error as Error).message);
  throw error;
}

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
  const unsubscribe = onSnapshot(expenseRef, (snapshot) => {
    const expenses: any[] = [];
    snapshot.forEach((docSnapshot) => {
      expenses.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    callback(expenses);
  });
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (userCredential.user) {
      // Update user profile with display name
      await updateProfile(userCredential.user, { displayName });
      
      // Send verification email automatically after registration
      try {
        await sendEmailVerification(userCredential.user);
        console.log("Registration successful and verification email sent");
      } catch (verificationError: any) {
        console.warn("Registration successful but verification email failed:", verificationError.message);
      }
      
      // Enforce verification before app access: sign out immediately
      try {
        await firebaseSignOut(auth);
        console.log("User signed out after registration to enforce email verification");
      } catch (signOutError: any) {
        console.warn("Sign out after registration failed:", signOutError.message);
      }
      
      // Return null so callers don't treat the user as logged in
      return null;
    }
    return null;
  } catch (error: any) {
    console.error("Registration error:", error.message);
    throw error;
  }
};

const loginUser = async (email: string, password: string): Promise<User | null> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  if (user && !user.emailVerified) {
    try {
      await sendEmailVerification(user);
      console.log("Verification email re-sent on unverified login");
    } catch (e: any) {
      console.warn("Failed resending verification email:", e?.message);
    }
    // Sign out and reject login
    try {
      await firebaseSignOut(auth);
    } catch {}
    throw new Error("Please verify your email before logging in. We've sent you a verification link.");
  }
  return user;
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
  getTripTotalExpenses
};
