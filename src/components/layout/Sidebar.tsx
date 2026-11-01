"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Share2,
  Globe2,
  Database,
  Sheet,
  Cpu,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    title: "Data Engines & Scrapers",
    items: [
      { name: "Omni-Channel Scraper", href: "/omni-scraper", icon: Target, badge: "360°" },
      { name: "Directory Scraper", href: "/campaigns", icon: Layers, badge: "B2B" },
      { name: "Google Maps Scraper", href: "/maps-scraper", icon: MapPin, badge: "Local" },
      { name: "Social Media Scraper", href: "/social-scraper", icon: Share2, badge: "NEW" },
      { name: "Custom URL Inspector", href: "/smart-scraper", icon: Globe2 },
    ],
  },
  {
    title: "Central Intelligence & CRM",
    items: [
      { name: "Data Explorer & Lists", href: "/data-explorer", icon: Database, badge: "Atlas" },
      { name: "Google Sheets Live Sync", href: "/sheets-sync", icon: Sheet },
    ],
  },
  {
    title: "Operations & Fleet",
    items: [
      { name: "Platform Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Workers & Queue", href: "/jobs", icon: Cpu },
      { name: "Settings & Proxies", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
            ScrapeFlow <span className="text-[9px] bg-blue-500/10 text-blue-600 px-1.5 py-0.2 rounded font-bold border border-blue-500/20">PRO</span>
          </h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Autonomous Data Engine</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.2 rounded font-bold tracking-tight shrink-0",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badge === "NEW"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Engine Status Footer */}
      <div className="p-3.5 border-t border-border bg-muted/30 m-3 rounded-xl space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground text-[11px]">Engine Status</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          MongoDB Atlas Connected • Stealth Active
        </p>
      </div>
    </aside>
  );
}

