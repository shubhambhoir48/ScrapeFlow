"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isEmailWhitelisted } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthorized: false,
  authError: null,
  signInWithGoogle: async () => false,
  signOutUser: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes with persistent session recovery
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const authorized = isEmailWhitelisted(currentUser.email);
          setIsAuthorized(authorized);
          if (!authorized && currentUser.email) {
            setAuthError(
              `Access denied for ${currentUser.email}. This account is not present in the verified whitelist.`
            );
          } else {
            setAuthError(null);
          }
        } else {
          setIsAuthorized(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firebase auth state error:", error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function signInWithGoogle(): Promise<boolean> {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser = result.user;
      setUser(signedInUser);

      const authorized = isEmailWhitelisted(signedInUser.email);
      setIsAuthorized(authorized);

      if (!authorized) {
        setAuthError(
          `Access denied for ${signedInUser.email || "this account"}. This account is not present in the verified whitelist.`
        );
        return false;
      }

      return true;
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        // User voluntarily dismissed popup
        return false;
      }
      console.error("Google Sign-In Error:", err);
      setAuthError(err.message || "Failed to sign in with Google. Please retry.");
      return false;
    }
  }

  async function signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthorized(false);
      setAuthError(null);
    } catch (err: any) {
      console.error("Sign Out Error:", err);
    }
  }

  function clearError() {
    setAuthError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthorized,
        authError,
        signInWithGoogle,
        signOutUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

