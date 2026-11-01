"use client";

import Link from "next/link";
import { PlusCircle, Database, Sheet, Radio, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { user, isAuthorized, signOutUser } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Project selector / telemetry status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Workspace:</span>
          <span className="text-sm font-semibold text-foreground px-2.5 py-1 bg-muted rounded-md border border-border">
            Global Enterprise Production
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Workers: 3/5</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium">
            <Database className="w-3.5 h-3.5" />
            <span>MongoDB Connected</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 font-medium">
            <Sheet className="w-3.5 h-3.5" />
            <span>Google Sheets Live Sync</span>
          </div>
        </div>
      </div>

      {/* User profile & Quick Action Buttons */}
      <div className="flex items-center gap-3">
        {user && isAuthorized && (
          <div className="flex items-center gap-2.5 pl-3 pr-2 py-1 bg-muted/50 border border-border rounded-lg text-xs">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Operator"}
                className="w-6 h-6 rounded-full border border-border"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-semibold text-foreground text-[11px] leading-tight flex items-center gap-1">
                {user.displayName || "Admin"}
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-tight max-w-[130px] truncate">
                {user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={signOutUser}
              title="Sign Out of Enterprise Console"
              className="ml-1 p-1 hover:bg-muted text-muted-foreground hover:text-red-600 rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Scraping Campaign</span>
        </Link>
      </div>
    </header>
  );
}

