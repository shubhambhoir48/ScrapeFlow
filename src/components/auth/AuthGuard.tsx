"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  LogOut,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Globe2,
  Database,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, authError, signInWithGoogle, signOutUser } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  // 1. Initial Authentication Check State
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground select-none">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold tracking-tight">ScrapeFlow Enterprise</h2>
            <p className="text-xs text-muted-foreground mt-1">Verifying encrypted session & authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Enterprise Google Sign-In Portal
  if (!user) {
    async function handleLogin() {
      setSigningIn(true);
      try {
        await signInWithGoogle();
      } finally {
        setSigningIn(false);
      }
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-4 relative overflow-hidden select-none">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Radial ambient glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-8 text-foreground">
            {/* Header / Brand */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 mb-4 ring-4 ring-blue-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">ScrapeFlow</h1>
                <span className="text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Autonomous Web Scraping, Directory Harvesting & B2B Lead Intelligence Engine
              </p>
            </div>

            {/* Error Banner if any */}
            {authError && (
              <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold">Authentication Notice</p>
                  <p className="opacity-90 mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* Google Sign In CTA */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleLogin}
                disabled={signingIn}
                className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {signingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google G SVG */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google (Gmail)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Whitelisted Operator Access Only</span>
                </div>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="mt-8 pt-6 border-t border-border/60 grid grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Globe2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>Playwright Stealth Crawler & Unmasking</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>MongoDB Atlas & Google Sheets Sync</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-[11px] text-slate-400">
            <span>Production Cluster &bull; Security Protocol v2.4 &bull; All Sessions Monitored</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated but NOT Whitelisted: Access Denied Screen
  if (user && !isAuthorized) {
    async function handleSwitchAccount() {
      await signOutUser();
      await signInWithGoogle();
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 select-none">
        <div className="w-full max-w-lg bg-card border border-red-500/30 shadow-2xl rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Top amber accent banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-red-500/5">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            This ScrapeFlow Enterprise deployment is strictly reserved for verified organization operators.
          </p>

          {/* Current Profile Card */}
          <div className="my-6 p-4 rounded-xl bg-muted/40 border border-border text-left flex items-center gap-3.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full border border-border shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground truncate">
                  {user.displayName || "Google Operator"}
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                  Not Whitelisted
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed mb-6">
            If you are an authorized team member, please sign in using one of the whitelisted administrative accounts, or contact your administrator to provision access.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sign In with Whitelisted Account</span>
            </button>
            <button
              type="button"
              onClick={signOutUser}
              className="py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl border border-border flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated & Whitelisted: Allow full access
  return <>{children}</>;
}

