import { messaging } from "../lib/firebase";
import {
  getToken as fetchToken,
  onMessage as listenMessage,
} from "firebase/messaging";

/**
 * Request permission from the user to display notifications.
 * Resolves when permission is granted, otherwise rejects.
 */
export const requestPermission = async () => {
  if (typeof Notification === "undefined") {
    throw new Error("Notifications not supported");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission not granted");
  }
};

/**
 * Retrieve the Firebase Cloud Messaging token for this device.
 * The service worker registration is passed so background
 * notifications can be handled.
 */
export const getToken = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await fetchToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (err) {
    console.error("FCM getToken error", err);
    return null;
  }
};

/**
 * Listen for foreground messages.
 * @param {(payload: import('firebase/messaging').MessagePayload) => void} cb
 */
export const onMessage = (cb) => listenMessage(messaging, cb);
