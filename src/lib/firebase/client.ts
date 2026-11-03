import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey && typeof window !== "undefined") {
  console.error(
    "[Firebase Config Error] Missing NEXT_PUBLIC_FIREBASE_API_KEY. " +
    "Please set NEXT_PUBLIC_FIREBASE_API_KEY in your environment variables (e.g. Vercel Project Settings) and redeploy."
  );
}

const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "wenture-india.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "wenture-india",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "wenture-india.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "633890572451",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:633890572451:web:f49713e1334887930e1716",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RXLZP5Q3LT",
};

// Initialize Firebase safely for SSR / SSG
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
