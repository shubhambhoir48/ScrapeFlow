"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { UserProfile, UserRole } from "@/core/models/User";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthorized: boolean;
  role: UserRole;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signUpWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

const SUPER_ADMINS = [
  "shubhambhoir4895@gmail.com",
  "bhoirshubham45@gmail.com",
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthorized: false,
  role: "MEMBER",
  authError: null,
  signInWithGoogle: async () => false,
  signUpWithGoogle: async () => false,
  signOutUser: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>("MEMBER");
  const [authError, setAuthError] = useState<string | null>(null);

  const syncProfile = async (currentUser: User): Promise<UserProfile | null> => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          return data.profile;
        }
      }
    } catch (e) {
      console.warn("User profile sync deferred (offline/cached):", e);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        if (currentUser && currentUser.email) {
          setIsAuthorized(true);
          const emailLower = currentUser.email.toLowerCase().trim();
          const determinedRole: UserRole = SUPER_ADMINS.includes(emailLower) ? "SUPER_ADMIN" : "MEMBER";
          setRole(determinedRole);
          setAuthError(null);

          // Sync user profile to database
          syncProfile(currentUser);
        } else {
          setIsAuthorized(false);
          setProfile(null);
          setRole("MEMBER");
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

  async function handleGoogleAuth(): Promise<boolean> {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser = result.user;
      setUser(signedInUser);
      setIsAuthorized(true);

      const emailLower = (signedInUser.email || "").toLowerCase().trim();
      const determinedRole: UserRole = SUPER_ADMINS.includes(emailLower) ? "SUPER_ADMIN" : "MEMBER";
      setRole(determinedRole);

      await syncProfile(signedInUser);
      return true;
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        return false;
      }
      console.error("Google Auth Error:", err);
      setAuthError(err.message || "Failed to authenticate with Google. Please try again.");
      return false;
    }
  }

  async function signInWithGoogle(): Promise<boolean> {
    return handleGoogleAuth();
  }

  async function signUpWithGoogle(): Promise<boolean> {
    return handleGoogleAuth();
  }

  async function signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setIsAuthorized(false);
      setRole("MEMBER");
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
        profile,
        loading,
        isAuthorized,
        role,
        authError,
        signInWithGoogle,
        signUpWithGoogle,
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
