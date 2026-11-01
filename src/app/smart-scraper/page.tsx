"use client";

import { useState } from "react";
import {
  Globe2,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  Database,
  Sheet,
  RotateCw,
  ExternalLink,
  Code,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Layers,
  Compass,
  Download,
} from "lucide-react";

export default function SmartScraperPage() {
  const [url, setUrl] = useState("https://www.maharashtradirectory.com/");
  const [inspecting, setInspecting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [crawlDepth, setCrawlDepth] = useState<"LEVEL_1_DIRECT" | "LEVEL_2_LISTINGS" | "LEVEL_3_DEEP_DETAILS">("LEVEL_2_LISTINGS");
  const [maxPages, setMaxPages] = useState(2);
  const [scrapedData, setScrapedData] = useState<Record<string, any>[] | null>(null);

  async function handleInspect() {
    if (!url.trim()) return;
    setInspecting(true);
    setErrorMessage(null);
    setScrapedData(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/smart-inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to inspect URL");

      setAnalysis(data);
      if (data.recommendedCrawlDepth) {
        setCrawlDepth(data.recommendedCrawlDepth);
      }
      const initialSelected: Record<string, boolean> = {};
      data.availableFields?.forEach((f: any) => {
        initialSelected[f.id] = true;
      });
      setSelectedFields(initialSelected);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to inspect target URL");
    } finally {
      setInspecting(false);
    }
  }

  function toggleField(id: string) {
    setSelectedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function selectAll(val: boolean) {
    const next: Record<string, boolean> = {};
    analysis?.availableFields?.forEach((f: any) => {
      next[f.id] = val;
    });
    setSelectedFields(next);
  }

  async function handleStartScrape() {
    const chosenFieldKeys = Object.entries(selectedFields)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (chosenFieldKeys.length === 0) {
      alert("Please select at least one field to scrape.");
      return;
    }

    setScraping(true);
    try {
      const res = await fetch("/api/smart-inspect", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          crawlDepth,
          maxPages,
          selectedFields: chosenFieldKeys,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract fields");
      setScrapedData(data.data || []);
    } catch (err: any) {
      alert(`Scraping error: ${err.message}`);
    } finally {
      setScraping(false);
    }
  }

  function exportCSV() {
    if (!scrapedData || scrapedData.length === 0) return;
    const first = scrapedData[0];
    const headers = Object.keys(first);
    const rows = scrapedData.map((r) => headers.map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extracted_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-blue-600" /> Smart Multi-Step URL Extractor & De-Obfuscator
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Audits website structure across Level 1 (Root), Level 2 (Paginated Listings), and Level 3 (Detail Profiles), discovering all extractable fields and unmasking hidden contacts.
        </p>
      </div>

      {/* URL Input Bar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <label className="text-xs font-semibold text-foreground block">
          Target Website URL to Audit & Inspect
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.maharashtradirectory.com/"
              className="w-full text-xs p-3 pl-9 bg-muted/40 border border-border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
          </div>
          <button
            onClick={handleInspect}
            disabled={inspecting}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          >
            {inspecting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" /> Auditing Hierarchy & Unmasking...
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" /> Inspect Internal Pages & Fields
              </>
            )}
          </button>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-xs">✕</button>
          </div>
        )}

        {/* Preset quick links */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <span className="text-[11px]">Quick samples:</span>
          <button
            type="button"
            onClick={() => setUrl("https://www.maharashtradirectory.com/")}
            className="text-[11px] text-blue-600 font-semibold hover:underline"
          >
            Maharashtra Directory
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setUrl("https://www.maharashtradirectory.com/product/abrasive-cutting-wheels.html")}
            className="text-[11px] text-blue-600 hover:underline"
          >
            Abrasive Cutting Wheels (Direct Listing)
          </button>
        </div>
      </div>

      {/* DISCOVERY & ANALYSIS RESULTS */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Site Hierarchy Header */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
              <div>
                <span className="font-bold text-foreground text-sm block">
                  {analysis.siteTitle}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Target: {analysis.targetUrl}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                Archetype: {analysis.siteArchetype}
              </span>
            </div>

            {/* Hierarchy Levels Found */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Level 1:</span>
                <span className="font-mono text-muted-foreground">{analysis.levelsFound?.level1?.name}</span>
              </div>
              {analysis.levelsFound?.level2 && (
                <div className="font-semibold text-foreground flex items-center gap-1.5 pl-4">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>Level 2 (Listings with Pagination):</span>
                  <span className="font-mono text-blue-600">
                    {analysis.levelsFound.level2.totalCategoriesFound} Product / Category Pathways Discovered
                  </span>
                </div>
              )}
              {analysis.levelsFound?.level3 && (
                <div className="font-semibold text-foreground flex items-center gap-1.5 pl-8">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Level 3 (Company Detail Profile):</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {analysis.levelsFound.level3.sampleEntityName} (Schema.org JSON-LD Unmasked)
                  </span>
                </div>
              )}
            </div>

            {/* De-Obfuscation Audit Box */}
            {analysis.unmaskingNotes && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> De-Obfuscation Audit:
                </span>
                {analysis.unmaskingNotes.map((note: string, i: number) => (
                  <p key={i} className="pl-5 text-[11px]">• {note}</p>
                ))}
              </div>
            )}
          </div>

          {/* Fields Selection & Crawl Configuration */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Available Fields Across Internal Pages ({analysis.availableFields?.length || 0} Found)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose which data fields to extract into your structured dataset.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px] border border-blue-200">
                  {selectedCount} Selected
                </span>
              </div>
            </div>

            {/* Fields Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.availableFields?.map((f: any) => {
                const isChecked = selectedFields[f.id] !== false;
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleField(f.id)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                      isChecked
                        ? "border-blue-500/50 bg-blue-500/5 shadow-sm"
                        : "border-border bg-card hover:bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="mt-0.5 text-blue-600 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {f.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground shrink-0">
                          {f.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {f.description}
                      </div>
                      {f.sampleValue && (
                        <div className="text-[11px] text-foreground bg-muted/60 p-1.5 rounded font-mono truncate">
                          Sample: &quot;{f.sampleValue}&quot;
                        </div>
                      )}
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {f.unmaskingStrategy}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crawl Settings Controls */}
            <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Crawl Depth
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "LEVEL_1_DIRECT", label: "Level 1: Direct" },
                    { id: "LEVEL_2_LISTINGS", label: "Level 2: Listings" },
                    { id: "LEVEL_3_DEEP_DETAILS", label: "Level 3: Deep" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setCrawlDepth(d.id as any)}
                      className={`p-2 rounded-lg border text-center font-medium transition-all ${
                        crawlDepth === d.id
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Pagination Limit (Max Pages to Crawl)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 1)}
                  className="w-full text-xs p-2 bg-muted/40 border border-border rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Launch Scraper Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ready to extract {selectedCount} field(s) across {maxPages} page(s)</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    const chosenFieldKeys = Object.entries(selectedFields)
                      .filter(([_, v]) => v)
                      .map(([k]) => k);
                    if (chosenFieldKeys.length === 0) {
                      alert("Please select at least one field.");
                      return;
                    }
                    try {
                      const res = await fetch("/api/campaigns", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: `${analysis.siteTitle?.slice(0, 30) || "Directory"} Background Scrape`,
                          type: "DIRECTORY_SCRAPER",
                          targetUrls: [url.trim()],
                          crawlDepth,
                          paginationLimit: maxPages,
                          selectedFieldKeys: chosenFieldKeys,
                          stealthMode: true,
                          concurrency: 3,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.location.href = "/campaigns";
                      }
                    } catch (e: any) {
                      alert(`Error launching campaign: ${e.message}`);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Layers className="w-4 h-4 text-blue-600" /> Run in Background & Free UI
                </button>

                <button
                  onClick={handleStartScrape}
                  disabled={scraping || selectedCount === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  {scraping ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Deep Crawling & Unmasking...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" /> Start Extracting Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Output Table */}
      {scrapedData && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Success:</strong> Extracted {scrapedData.length} records. All records have been persisted to the central database (Data Explorer) and queued for autonomous cascade enrichment.
              </span>
            </span>
            <a
              href="/data-explorer"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 ml-4"
            >
              Open Data Explorer <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" /> Extracted Structured Results ({scrapedData.length} records)
            </h3>
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-x-auto max-h-80">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold sticky top-0">
                <tr>
                  <th className="px-3 py-2">Company Name</th>
                  <th className="px-3 py-2">Decision Maker</th>
                  <th className="px-3 py-2">Designation</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Products</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                {scrapedData.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-bold text-foreground">{r.companyName || r.name || "-"}</td>
                    <td className="px-3 py-2 text-foreground">{r.contactPerson || "-"}</td>
                    <td className="px-3 py-2">
                      {r.designation ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {r.designation}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{r.phone || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]" title={r.fullAddress || r.address}>
                      {r.fullAddress || r.address || "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]" title={r.products}>
                      {r.products || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
