// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAlVC5S6hLBbalo8nKjmgqt0TYz9N6iQNk",
  authDomain: "resume-7b7cb.firebaseapp.com",
  projectId: "resume-7b7cb",
  storageBucket: "resume-7b7cb.firebasestorage.app",
  messagingSenderId: "552187751690",
  appId: "1:552187751690:web:fb85e27d1baefab1a45ef3",
  measurementId: "G-TLNW7PSMT8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return { success: false, error: error.message };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, analytics };
