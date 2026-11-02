import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ScrapeFlow Firebase Web SDK configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCqfSv0c4FIuuYzR80yHZzIsIP54xZh4Pk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "scrapeflow-dce79.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "scrapeflow-dce79",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "scrapeflow-dce79.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "641765762176",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:641765762176:web:e8167b9785c94bb9257265",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-913TMW61ZV",
};

// Initialize Firebase as a robust singleton across SSR and client navigation
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Approved Whitelist - configured via NEXT_PUBLIC_AUTHORIZED_EMAILS in .env.local
const envEmails = process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS
  ? process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS.split(",").map((email) => email.toLowerCase().trim()).filter(Boolean)
  : [];

export const AUTHORIZED_EMAILS: string[] = envEmails.length > 0
  ? envEmails
  : ["shubhambhoir4895@gmail.com", "bhoirshubham45@gmail.com"];

export function isEmailWhitelisted(email?: string | null): boolean {
  if (!email) return false;
  if (AUTHORIZED_EMAILS.includes("*")) return true;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase().trim());
}
