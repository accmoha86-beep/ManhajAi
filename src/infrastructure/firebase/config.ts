// infrastructure/firebase/config.ts — Client-side Firebase Phone Auth
'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth, ConfirmationResult as FBConfirmationResult, RecaptchaVerifier as FBRecaptchaVerifier } from 'firebase/auth';

export type { FBConfirmationResult as ConfirmationResult };

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

/**
 * Check if Firebase is configured via env vars.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

/**
 * Get or initialize Firebase App.
 */
export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return null;
  if (firebaseApp) return firebaseApp;

  const { initializeApp } = await import('firebase/app');
  firebaseApp = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || undefined,
  });
  return firebaseApp;
}

/**
 * Get or initialize Firebase Auth.
 */
export async function getFirebaseAuth(): Promise<Auth | null> {
  if (!isFirebaseConfigured()) return null;
  if (firebaseAuth) return firebaseAuth;

  const app = await getFirebaseApp();
  if (!app) return null;

  const { getAuth } = await import('firebase/auth');
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

/**
 * Setup invisible reCAPTCHA verifier for phone auth.
 */
export async function setupRecaptcha(containerId: string): Promise<FBRecaptchaVerifier | null> {
  const auth = await getFirebaseAuth();
  if (!auth) return null;

  const { RecaptchaVerifier } = await import('firebase/auth');
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });

  return verifier;
}

/**
 * Convert Egyptian phone (01xxx) to international format (+20xxx) and send OTP.
 */
export async function sendFirebaseOTP(
  phone: string,
  recaptchaVerifier: FBRecaptchaVerifier
): Promise<FBConfirmationResult> {
  const auth = await getFirebaseAuth();
  if (!auth) throw new Error('Firebase not configured');

  const { signInWithPhoneNumber } = await import('firebase/auth');

  // Convert 01xxx to +201xxx
  let intlPhone = phone;
  if (phone.startsWith('01')) {
    intlPhone = '+2' + phone;
  } else if (!phone.startsWith('+')) {
    intlPhone = '+20' + phone;
  }

  return signInWithPhoneNumber(auth, intlPhone, recaptchaVerifier);
}

/**
 * Verify OTP code and return Firebase ID token.
 */
export async function verifyFirebaseOTP(
  confirmationResult: FBConfirmationResult,
  code: string
): Promise<string> {
  const result = await confirmationResult.confirm(code);
  const idToken = await result.user.getIdToken();
  return idToken;
}
