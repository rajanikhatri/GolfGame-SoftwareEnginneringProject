import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyA7T_eTujRvTgJHY67fA72lzLLBioDYSV8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'golfgame-ee8bf.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'golfgame-ee8bf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'golfgame-ee8bf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1003116857411',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:1003116857411:web:2b4383436adc1f1f0d6cf6',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-FD7FHQ940M',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (analyticsPromise) return analyticsPromise;
  analyticsPromise = isSupported()
    .then((ok) => (ok ? getAnalytics(firebaseApp) : null))
    .catch(() => null);
  return analyticsPromise;
}

export async function ensureAnonymousUser(): Promise<User> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  const cred = await signInAnonymously(firebaseAuth);
  return cred.user;
}

export interface PlayerAccountProfile {
  uid: string;
  email: string | null;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number;
}

function userProfileRef(uid: string) {
  return doc(firebaseDb, 'users', uid);
}

async function upsertUserProfile(user: User, displayNameOverride?: string) {
  const now = Date.now();
  const ref = userProfileRef(user.uid);
  const existing = await getDoc(ref);
  const existingData = existing.exists() ? (existing.data() as Partial<PlayerAccountProfile>) : null;
  const displayName =
    (displayNameOverride && displayNameOverride.trim()) ||
    (user.displayName && user.displayName.trim()) ||
    existingData?.displayName ||
    'Player';

  const nextProfile: PlayerAccountProfile = {
    uid: user.uid,
    email: user.email,
    displayName,
    createdAt: existingData?.createdAt ?? now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await setDoc(ref, nextProfile, { merge: true });
  return nextProfile;
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  const cleanedName = displayName.trim() || 'Player';
  await updateProfile(cred.user, { displayName: cleanedName });
  const profile = await upsertUserProfile(cred.user, cleanedName);
  return { user: cred.user, profile };
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const profile = await upsertUserProfile(cred.user);
  return { user: cred.user, profile };
}

export async function logoutFirebaseUser() {
  await signOut(firebaseAuth);
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(userProfileRef(uid));
  return snap.exists() ? (snap.data() as PlayerAccountProfile) : null;
}

export function onFirebaseAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
