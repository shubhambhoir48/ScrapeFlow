import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ScrapeFlow Firebase Web SDK configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqfSv0c4FIuuYzR80yHZzIsIP54xZh4Pk",
  authDomain: "scrapeflow-dce79.firebaseapp.com",
  projectId: "scrapeflow-dce79",
  storageBucket: "scrapeflow-dce79.firebasestorage.app",
  messagingSenderId: "641765762176",
  appId: "1:641765762176:web:e8167b9785c94bb9257265",
  measurementId: "G-913TMW61ZV",
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
  : ["admin@example.com"];

export function isEmailWhitelisted(email?: string | null): boolean {
  if (!email) return false;
  if (AUTHORIZED_EMAILS.includes("*")) return true;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase().trim());
}

