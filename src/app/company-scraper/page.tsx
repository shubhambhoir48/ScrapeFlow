"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompanyScraperRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/campaigns");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to Scraping Campaigns...</p>
      </div>
    </div>
  );
}
