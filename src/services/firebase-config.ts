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

/**
 * The project's default Firebase web config. These are PUBLIC client
 * identifiers (not secrets) — Firebase web config is designed to be shipped to
 * the browser; access is enforced by Firebase Security Rules and the
 * authorized-domains allowlist. Environment variables (VITE_FIREBASE_*) take
 * precedence, so a different project can be used without editing code.
 */
const DEFAULTS = {
  apiKey: 'AIzaSyBvh1jnDXVsaMZW936A0OFe_-QCQnM_gWE',
  authDomain: 'focusflow-b3dde.firebaseapp.com',
  projectId: 'focusflow-b3dde',
  storageBucket: 'focusflow-b3dde.firebasestorage.app',
  messagingSenderId: '551871883912',
  appId: '1:551871883912:web:fb7c33adefdcf3e3340d3d',
}

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) ?? DEFAULTS.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? DEFAULTS.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? DEFAULTS.projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? DEFAULTS.storageBucket,
  messagingSenderId:
    (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? DEFAULTS.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) ?? DEFAULTS.appId,
}

/** True when enough config is present to initialise Firebase Auth. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
)
