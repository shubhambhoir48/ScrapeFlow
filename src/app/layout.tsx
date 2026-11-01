import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "ScrapeFlow Enterprise | Autonomous Web Extraction & Lead Intelligence Engine",
  description: "Enterprise SaaS platform for multi-source data extraction, deep directory crawling, and CRM synchronization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased flex">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

