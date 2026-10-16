/**
 * Firebase configuration, read from Vite environment variables.
 *
 * These values are PUBLIC client identifiers (not secrets) — Firebase web
 * config is safe to ship to the browser. Security is enforced by Firebase
 * Security Rules and the authorised-domains list, not by hiding this config.
 *
 * When the variables are absent the app simply runs in local-first mode
 * (no accounts) — nothing else breaks.
 */
const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** True when enough config is present to initialise Firebase Auth. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
)
