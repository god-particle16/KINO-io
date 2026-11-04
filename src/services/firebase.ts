/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyD3seIh9n7JtNo4NuAYeQHCK_D8wWWkLOY',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'kino-io.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    'kino-io',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'kino-io.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '2760950068',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:2760950068:web:c76ef802d7853d3120a561',
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google with popup, falling back to redirect if popup is blocked or unsupported
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (err: any) {
    // If popup was blocked or window closed, fall back to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/popup-closed-by-user'
    ) {
      console.warn('Popup was blocked or closed, falling back to redirect flow:', err);
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * Sign out helper
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Clean object of undefined values so Firestore does not reject them
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeForFirestore(item)
          : item
      );
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  writeBatch,
  getRedirectResult,
  onAuthStateChanged,
};
export type { User, Unsubscribe };
