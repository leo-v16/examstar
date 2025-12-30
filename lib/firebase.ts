import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

let app: FirebaseApp;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch {
  console.warn("Firebase initialization failed (likely due to missing env vars during build). Using fallback.");
  // Fallback for build/CI environments where secrets might be missing
  if (!getApps().length) {
      app = initializeApp({
        apiKey: "AIzaSyDummyKeyForBuildProcess",
        authDomain: "dummy.firebaseapp.com",
        projectId: "dummy-project",
      }, "build-fallback"); 
  } else {
      app = getApp();
  }
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
