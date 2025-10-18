import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration is supplied via environment variables.
// These variables should be defined in .env.local and never committed.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Prevent Firebase from being initialised multiple times during hot reload.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth = getAuth(app);

// Connect to Auth Emulator if in development
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (error) {
    // Emulator already connected
    console.info("Auth emulator connection skipped");
  }
}

// Use the named Firestore database instance if specified in environment variables
// If NEXT_PUBLIC_FIREBASE_DATABASE_NAME is not set or is "(default)", uses the default database
const databaseName = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_NAME;
export const db =
  databaseName && databaseName !== "(default)"
    ? getFirestore(app, databaseName)
    : getFirestore(app);

// Connect to Firestore Emulator if in development and not already connected
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch (error) {
    // Emulator already connected or not available
    console.info("Firestore emulator connection skipped");
  }
}

export default app;
