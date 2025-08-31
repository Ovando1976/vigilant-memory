// src/lib/firebaseMessaging.js
import { getApp } from "firebase/app";

/**
 * Initialize Firebase Messaging only when supported & explicitly enabled.
 * Returns { messaging, registration } or null.
 */
export async function initFirebaseMessaging() {
  try {
    if (process.env.REACT_APP_ENABLE_MESSAGING !== "1") {
      console.info("[FCM] disabled by REACT_APP_ENABLE_MESSAGING");
      return null;
    }

    const { isSupported, getMessaging } = await import("firebase/messaging");

    const supported = await isSupported();
    const secure = typeof window !== "undefined" && window.isSecureContext;
    const swOK = typeof navigator !== "undefined" && "serviceWorker" in navigator;

    if (!supported || !secure || !swOK) {
      console.warn("[FCM] unsupported (supported:", supported, "secure:", secure, "sw:", swOK, ")");
      return null;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const app = getApp();
    const messaging = getMessaging(app);

    // You can request a token here behind a user action if needed:
    // const { getToken } = await import("firebase/messaging");
    // const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    // const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

    return { messaging, registration };
  } catch (err) {
    console.warn("[FCM] init failed:", err);
    return null;
  }
}