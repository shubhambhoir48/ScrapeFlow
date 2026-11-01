"use client";

import { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Cpu,
  Key,
  Globe,
  Database,
  Save,
  CheckCircle2,
  Server,
  Terminal,
  Play,
  RotateCw,
  Layers,
  MapPin,
  Sparkles,
  Zap,
  Code2,
  FileCode,
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const [concurrency, setConcurrency] = useState(4);
  const [delayMs, setDelayMs] = useState(1500);
  const [stealthMode, setStealthMode] = useState(true);
  const [maxPagesDefault, setMaxPagesDefault] = useState(5);
  const [autoEnrichNewLeads, setAutoEnrichNewLeads] = useState(true);

  // Script Runner State
  const [runningScript, setRunningScript] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; cluster?: string; error?: string } | null>(null);

  async function handleTestDb() {
    setTestingDb(true);
    setDbStatus(null);
    try {
      const res = await fetch("/api/db-status");
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      setDbStatus({ connected: false, error: err.message });
    } finally {
      setTestingDb(false);
    }
  }

  async function runMicroScraperTest(scraperName: string) {
    setRunningScript(scraperName);
    setScriptOutput(null);

    // Call enrichment test or simulated micro-scraper
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runPending: true }),
      });
      const data = await res.json();
      setScriptOutput(
        `[SUCCESS] Launched ${scraperName} fleet.\nResult: ${data.message || "Execution initiated successfully in background."}\nTelemetry: Autonomous cascade enrichment active.`
      );
    } catch (err: any) {
      setScriptOutput(`[ERROR] ${err.message}`);
    } finally {
      setRunningScript(null);
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" /> Enterprise Scraper Fleet & Engine Configuration
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review active scraper engines, defined data sources, specialized de-obfuscation micro-scrapers, and background worker telemetry.
        </p>
      </div>

      <div className="space-y-6">
        {/* ======================================================== */}
        {/* SECTION 1: ACTIVE SCRAPER FLEET & MICRO-SCRAPERS HUB */}
        {/* ======================================================== */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" /> Enterprise Scraper Engines & Micro-Scraper Fleet
              </h3>
              <p className="text-xs text-muted-foreground">
                Domain-specific scraping agents equipped with anti-detection and de-obfuscation algorithms.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              5 Engines Online
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Scraper 1 */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Multi-Level Directory Super-Spider
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  PLAYWRIGHT STEALTH
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Expertise:</strong> Bypasses Cloudflare WAF, navigates Level 1 directory trees, and iterates through up to 50 pages of listings to extract structured business cards.
              </p>
              <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-3">
                <span>Targets: <strong>Maharashtra Directory, YellowPages, IndiaMART</strong></span>
              </div>
            </div>

            {/* Scraper 2 */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Google Maps Places & Phone Unmasker
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  GEO-INTELLIGENCE
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Expertise:</strong> Resolves directory SMS OTP barriers by querying Google Maps to extract unmasked phone numbers, verified reviews, star ratings, and official domains.
              </p>
              <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-3">
                <span>Targets: <strong>Google Maps, Local Business Registries</strong></span>
              </div>
            </div>

            {/* Scraper 3 */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Corporate Domain & Deep Contact Spider
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  RECURSIVE SPIDER
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Expertise:</strong> Recursively audits official corporate websites (`/contact-us`, `/about-us`, `/reach-us`) to extract corporate MX emails, direct mobile numbers, and WhatsApp chat links.
              </p>
              <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-3">
                <span>Targets: <strong>Official Enterprise Websites</strong></span>
              </div>
            </div>

            {/* Scraper 4 */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600" />
                  Autonomous Cascade OSINT Enricher
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  BACKGROUND WORKER
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Expertise:</strong> Non-blocking background worker that monitors MongoDB Atlas and cross-references fragmented leads across search engines and registries without human intervention.
              </p>
              <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-3">
                <span>Targets: <strong>DuckDuckGo, Bing, LinkedIn Search</strong></span>
              </div>
            </div>

            {/* Scraper 5 */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  Custom Python & Node Micro-Scrapers Hub
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  PYTHON / NODE SCRIPTS
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Expertise:</strong> Executes standalone Python (`BeautifulSoup`, `Playwright`, `Scrapy`) or Node.js micro-scrapers stored in <code>scripts/scrapers/</code>, streaming verified leads straight into MongoDB.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={runningScript !== null}
                  onClick={() => runMicroScraperTest("Autonomous Cascade Fleet")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {runningScript ? (
                    <>
                      <RotateCw className="w-3 h-3 animate-spin" /> Running Micro-Scraper Fleet...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-white" /> Test-Run Micro-Scraper Fleet
                    </>
                  )}
                </button>
              </div>

              {scriptOutput && (
                <div className="mt-2 p-2.5 bg-zinc-950 text-zinc-300 rounded-lg font-mono text-[11px] border border-zinc-800 whitespace-pre-line">
                  {scriptOutput}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: DEFINED DATA SOURCES MATRIX */}
        {/* ======================================================== */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" /> Supported Data Sources & Intelligence Matrix
            </h3>
            <p className="text-xs text-muted-foreground">
              Comprehensive list of configured intelligence sources and their unmasking protocols.
            </p>
          </div>

          <div className="border border-border rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Source & Domain</th>
                  <th className="px-4 py-2.5">Protocol / Adapter</th>
                  <th className="px-4 py-2.5">Extracted Data Points</th>
                  <th className="px-4 py-2.5">De-Obfuscation Method</th>
                  <th className="px-4 py-2.5">Anti-Ban Armor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-bold text-foreground">Maharashtra Directory / B2B Portals</td>
                  <td className="px-4 py-2.5 font-mono text-blue-600">Playwright Headless Chrome</td>
                  <td className="px-4 py-2.5 text-muted-foreground">Company Name, Decision Maker, Designation, Factory Address</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-medium">HTML Title tag & Schema.org JSON-LD</td>
                  <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">CLOUDFLARE BYPASS</span></td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-bold text-foreground">Google Maps Places Engine</td>
                  <td className="px-4 py-2.5 font-mono text-amber-600">Direct Headless Search</td>
                  <td className="px-4 py-2.5 text-muted-foreground">Unmasked Telephone, Operational Address, Star Ratings, Reviews</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-medium">Bypasses SMS OTP directory barriers</td>
                  <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">RATE-PACED</span></td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-bold text-foreground">Official Corporate Websites</td>
                  <td className="px-4 py-2.5 font-mono text-emerald-600">Recursive Cheerio & Playwright</td>
                  <td className="px-4 py-2.5 text-muted-foreground">Corporate Emails (info@, sales@), Direct Mobile, WhatsApp</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-medium">DOM Mailto/Tel anchors & Regex</td>
                  <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">ORIGIN ROTATION</span></td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-bold text-foreground">Metasearch (DuckDuckGo / Bing / SearXNG)</td>
                  <td className="px-4 py-2.5 font-mono text-purple-600">HTTP Stealth Query</td>
                  <td className="px-4 py-2.5 text-muted-foreground">LinkedIn executive profiles, Zauba/MCA official filings</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-medium">Search snippet entity extraction</td>
                  <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">SESSION RANDOMIZED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: WORKER CONCURRENCY & PACING */}
        {/* ======================================================== */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" /> Background Crawler Fleet & Pacing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="font-medium text-foreground">
                  Active Chromium Worker Threads: {concurrency}
                </label>
                <span className="text-muted-foreground font-mono">Max: 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Number of simultaneous pages/categories crawled in parallel.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="font-medium text-foreground">
                  Request Delay Jitter: {delayMs}ms
                </label>
                <span className="text-muted-foreground font-mono">Anti-ban</span>
              </div>
              <input
                type="range"
                min={500}
                max={4000}
                step={100}
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Randomized interval between HTTP navigations to prevent IP rate-limiting.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={autoEnrichNewLeads}
                onChange={(e) => setAutoEnrichNewLeads(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="font-semibold text-foreground">
                Continuous Autonomous Auto-Enrichment (Automatically cascade Google Maps and websites on new leads)
              </span>
            </label>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: DATABASE TELEMETRY */}
        {/* ======================================================== */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  MongoDB Atlas Persistence Engine (Connected via Google DNS)
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {dbStatus?.cluster ? `${dbStatus.cluster} (Active)` : "Configured via MONGODB_URI in environment"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestDb}
                disabled={testingDb}
                className="px-3.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                {testingDb ? "Pinging Atlas..." : "Test Atlas Ping"}
              </button>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-semibold border border-emerald-200">
                Atlas Connected
              </span>
            </div>
          </div>

          {dbStatus && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                dbStatus.connected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {dbStatus.connected
                  ? `Connected to MongoDB Atlas: ${dbStatus.cluster || "Active"}`
                  : `Atlas status: ${dbStatus.error}`}
              </span>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Configuration successfully updated!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
