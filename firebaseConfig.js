// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth 
} from "firebase/auth";
import { getReactNativePersistence } from "@firebase/auth/react-native"; // ✅ correct import
import AsyncStorage from "@react-native-async-storage/async-storage";
const firebaseConfig = {
   apiKey: "AIzaSyBhkgmgkSTNmFQXfMfQcl6ShA7qJkvRtiI",
  authDomain: "mates-ffbb1.firebaseapp.com",
  projectId: "mates-ffbb1",
  storageBucket: "mates-ffbb1.firebasestorage.app",
  messagingSenderId: "952108330206",
  appId: "1:952108330206:android:bb28b2f29e40d628d0e64f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});


export {app, auth };
