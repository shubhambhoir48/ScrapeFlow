"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Globe2,
  Database,
  ShieldCheck,
  Check,
  UserCheck,
  Lock,
} from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, authError, signInWithGoogle, signUpWithGoogle } = useAuth();
  const [authMode, setAuthMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [submitting, setSubmitting] = useState(false);

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
            <p className="text-xs text-muted-foreground mt-1">Initializing secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Sign In / Sign Up Portal
  if (!user || !isAuthorized) {
    async function handleAuthAction() {
      setSubmitting(true);
      try {
        if (authMode === "SIGN_UP") {
          await signUpWithGoogle();
        } else {
          await signInWithGoogle();
        }
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-4 relative overflow-hidden select-none">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Ambient radial glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-8 text-foreground">
            {/* Header / Brand */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 mb-3.5 ring-4 ring-blue-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">ScrapeFlow</h1>
                <span className="text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  CLOUD
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Autonomous B2B Lead Intelligence, Directory Crawlers & Live Data Enrichment
              </p>
            </div>

            {/* Auth Mode Tabs: Sign In vs Create Account */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-xl mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode("SIGN_IN")}
                className={`py-2 rounded-lg transition-all ${
                  authMode === "SIGN_IN"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("SIGN_UP")}
                className={`py-2 rounded-lg transition-all ${
                  authMode === "SIGN_UP"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Mode Banner */}
            <div className="mb-5 text-center">
              <h2 className="text-sm font-bold text-foreground">
                {authMode === "SIGN_UP" ? "Create your free account" : "Welcome back to your workspace"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {authMode === "SIGN_UP"
                  ? "Get instant access with your Google account. Your data is isolated and encrypted."
                  : "Sign in with your Google account to access your scrapers and leads."}
              </p>
            </div>

            {/* Error Banner if any */}
            {authError && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold">Authentication Notice</p>
                  <p className="opacity-90 mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* Sign Up Value Props */}
            {authMode === "SIGN_UP" && (
              <div className="space-y-2 mb-6 p-3 bg-muted/40 border border-border/60 rounded-xl text-left">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Private workspace with dedicated data isolation</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited directory scraping & contact de-masking</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Real-time bi-directional Google Sheets sync</span>
                </div>
              </div>
            )}

            {/* Google OAuth Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleAuthAction}
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>
                      {authMode === "SIGN_UP" ? "Sign up with Google (Gmail)" : "Sign in with Google (Gmail)"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              {/* Mode switch helper text */}
              <div className="pt-2 text-center text-xs text-muted-foreground">
                {authMode === "SIGN_IN" ? (
                  <span>
                    New to ScrapeFlow?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("SIGN_UP")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Create an account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("SIGN_IN")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* Feature Badges */}
            <div className="mt-7 pt-6 border-t border-border/60 grid grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>Isolated User Workspaces</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Encrypted Cloud Storage</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-[11px] text-slate-400">
            <span>By proceeding, you agree to our Terms of Service &bull; All data isolated per account</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render full application
  return <>{children}</>;
}
