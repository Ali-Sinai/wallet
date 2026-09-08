import { firebaseConfig, isFirebaseConfigured, vapidKey } from "./firebaseConfig";

export type PushEnableResult =
  | { ok: true; token: string }
  | { ok: false; reason: "not-configured" | "permission-denied" | "no-service-worker" | "error"; error?: unknown };

/**
 * Requests notification permission, registers firebase-messaging-sw.js, and
 * returns an FCM token to POST at /api/push/subscribe. Never throws — every
 * failure mode (Firebase not configured, permission denied, no SW support)
 * comes back as a typed result so the UI can show a clear message instead
 * of a crash.
 */
export async function enablePush(): Promise<PushEnableResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, reason: "not-configured" };
  }
  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "no-service-worker" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "permission-denied" };
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const { initializeApp } = await import("firebase/app");
    const { getMessaging, getToken } = await import("firebase/messaging");

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

    return { ok: true, token };
  } catch (error) {
    return { ok: false, reason: "error", error };
  }
}
