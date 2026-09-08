/**
 * Firebase Web app config — NOT a secret. This identifies which Firebase
 * project to talk to; access is still controlled by your backend's own
 * auth (see app/security.py) and by Firebase's own security rules.
 *
 * Fill these in from: Firebase console -> Project settings -> General ->
 * "Your apps" -> Web app -> SDK setup and configuration.
 *
 * vapidKey comes from: Project settings -> Cloud Messaging -> Web Push
 * certificates -> "Generate key pair".
 *
 * Until these are filled in, push notifications are simply unavailable in
 * the UI — nothing else in the app depends on this file.
 */
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const vapidKey = "REPLACE_ME";

export const isFirebaseConfigured =
  !Object.values(firebaseConfig).some((v) => v.startsWith("REPLACE_ME")) && vapidKey !== "REPLACE_ME";
