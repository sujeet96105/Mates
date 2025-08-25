// firebase.ts - Simplified Firebase initialization focusing on Firestore only
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

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
let app: FirebaseApp | undefined;
let db: Firestore | null = null;

// Generate a simple user ID for anonymous usage
const generateUserId = () => {
  return 'anon-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// Store user ID in a simple way
let currentUserId: string | null = null;

try {
  // Initialize Firebase app if not already done
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Initialize Firestore only
    db = getFirestore(app);
    console.log('Firestore initialized successfully');
    
    // Generate anonymous user ID
    currentUserId = generateUserId();
    console.log('Generated anonymous user ID:', currentUserId);
    
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    currentUserId = generateUserId();
    console.log('Firebase already initialized, using existing Firestore instance');
  }
  
  console.log('Firebase setup complete (Firestore only)');
} catch (error: any) {
  console.error('Firebase initialization error:', error.message);
  db = null;
  currentUserId = null;
}

// Function to get the current user ID (anonymous)
const getUserId = (): string | null => {
  return currentUserId;
};

// Mock auth instance for compatibility
const mockAuth = {
  currentUser: currentUserId ? { uid: currentUserId, isAnonymous: true } : null
};

const getAuthInstance = async () => {
  return null; // Auth disabled for now
};

export { app, db, getAuthInstance, getUserId };
export const appId: string = "mates-ffbb1";
export const initialAuthToken: string | null = null;
