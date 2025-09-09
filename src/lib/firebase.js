// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  // connectFirestoreEmulator, // optional
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:             process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:         process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL:        process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId:          process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:      process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:              process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId:      process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// ---- Firestore: force long‑polling on iOS/Safari/github.dev ----
let db;
try {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS/.test(ua);
  const onGithubDev = typeof location !== 'undefined' && /\.github\.dev$/.test(location.hostname);

  if (isIOS || isSafari || onGithubDev) {
    // Stronger than auto‑detect; avoids the stalled WebChannel fetch
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
  } else {
    db = getFirestore(app);
  }
} catch {
  db = getFirestore(app);
}
export { db };

// ---- Auth / Providers ----
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ---- Analytics (only if supported) ----
let analytics = null;
try {
  if (typeof window !== 'undefined' && window.isSecureContext && !!firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }
} catch {}
export { analytics };

// ---- Messaging (only if supported) ----
let messaging = null;
try {
  if (typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch {}
export { messaging };
// ---- Storage ----
export const storage = getStorage(app);