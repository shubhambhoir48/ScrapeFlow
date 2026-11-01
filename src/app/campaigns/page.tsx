"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  PlusCircle,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  Terminal,
  ShieldCheck,
  Globe,
  Building2,
  MapPin,
  Database,
  Sheet,
  Sparkles,
  ChevronRight,
  Eye,
  X,
  Search,
  CheckSquare,
  Square,
  Compass,
  FileSpreadsheet,
  Cpu,
  Info,
} from "lucide-react";
import { ScrapingCampaign, CampaignType } from "@/core/models/Campaign";

const PRESET_TEMPLATES = [
  {
    name: "Maharashtra Industrial Directory (100k+ Full Database)",
    desc: "100k+ Maharashtra manufacturers, suppliers & engineering units across all categories",
    url: "https://www.maharashtradirectory.com/",
    type: "DIRECTORY_SCRAPER" as CampaignType,
    depth: "LEVEL_2_LISTINGS" as const,
    quota: 0,
    isUnlimited: true,
    pagination: 25,
    tag: "100k+ Full Database (Unlimited)",
  },
  {
    name: "IndiaBizClub Directory (Suppliers & Exporters)",
    desc: "Pan-India B2B verified manufacturers and key contact persons",
    url: "https://www.indiabizclub.com/",
    type: "DIRECTORY_SCRAPER" as CampaignType,
    depth: "LEVEL_2_LISTINGS" as const,
    quota: 0,
    isUnlimited: true,
    pagination: 20,
    tag: "Pan-India B2B (Unlimited)",
  },
  {
    name: "TradeIndia Industrial Machinery Catalog",
    desc: "Heavy machinery, CNC equipment and plant suppliers",
    url: "https://www.tradeindia.com/",
    type: "DIRECTORY_SCRAPER" as CampaignType,
    depth: "LEVEL_2_LISTINGS" as const,
    quota: 1000,
    isUnlimited: false,
    pagination: 10,
    tag: "Industrial Machinery",
  },
  {
    name: "YellowPages India Enterprise Hub",
    desc: "Regional B2B companies with phone, location and email",
    url: "https://www.yellowpages.in/",
    type: "DIRECTORY_SCRAPER" as CampaignType,
    depth: "LEVEL_2_LISTINGS" as const,
    quota: 5000,
    isUnlimited: false,
    pagination: 15,
    tag: "Commercial YellowPages",
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<ScrapingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // New Campaign Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("DIRECTORY_SCRAPER");
  const [targetUrlsInput, setTargetUrlsInput] = useState("https://www.maharashtradirectory.com/");
  const [stealthMode, setStealthMode] = useState(true);
  const [concurrency, setConcurrency] = useState(3);
  const [crawlDepth, setCrawlDepth] = useState<"LEVEL_1_DIRECT" | "LEVEL_2_LISTINGS" | "LEVEL_3_DEEP_DETAILS">("LEVEL_2_LISTINGS");
  const [paginationLimit, setPaginationLimit] = useState(10);
  const [targetQuota, setTargetQuota] = useState(100);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [liveSyncToSheet, setLiveSyncToSheet] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Site Discovery / Field Explorer state
  const [inspecting, setInspecting] = useState(false);
  const [discoveredAnalysis, setDiscoveredAnalysis] = useState<any | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    companyName: true,
    contactPerson: true,
    designation: true,
    phone: true,
    email: true,
    fullAddress: true,
    city: true,
    state: true,
    postalCode: true,
    products: true,
    companyInfoUrl: true,
  });

  // Open View Modal / Drawer
  const [selectedCampaign, setSelectedCampaign] = useState<ScrapingCampaign | null>(null);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      if (selectedCampaign) {
        const updated = data.campaigns?.find((c: ScrapingCampaign) => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 2500);
    return () => clearInterval(interval);
  }, [selectedCampaign?.id]);

  // Keyboard Escape listener to close any open modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedCampaign(null);
        setModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Run Site Discovery & Field Explorer on target URL
  async function handleInspectSite() {
    const rawUrl = targetUrlsInput.split("\n")[0]?.trim();
    if (!rawUrl) {
      alert("Please enter a target website URL first.");
      return;
    }

    setInspecting(true);
    setDiscoveredAnalysis(null);
    try {
      const res = await fetch("/api/smart-inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to inspect website");

      setDiscoveredAnalysis(data);
      if (data.recommendedCrawlDepth) {
        setCrawlDepth(data.recommendedCrawlDepth);
      }
      if (!campaignName) {
        setCampaignName(`${data.siteTitle?.slice(0, 35) || "Web"} Intelligence Scrape`);
      }
    } catch (err: any) {
      alert(`Inspection error: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  }

  function toggleField(fieldId: string) {
    setSelectedFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  }

  function toggleAllFields(val: boolean) {
    const next: Record<string, boolean> = {};
    if (discoveredAnalysis?.availableFields) {
      discoveredAnalysis.availableFields.forEach((f: any) => {
        next[f.id] = val;
      });
    } else {
      Object.keys(selectedFields).forEach((k) => (next[k] = val));
    }
    setSelectedFields(next);
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    const urls = targetUrlsInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (!campaignName.trim() || urls.length === 0) {
      alert("Please provide a campaign name and at least one target URL.");
      return;
    }

    setSubmitting(true);
    try {
      const chosenFieldKeys = Object.entries(selectedFields)
        .filter(([_, checked]) => checked)
        .map(([k]) => k);

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          type: campaignType,
          targetUrls: urls,
          engine: "PLAYWRIGHT_STEALTH",
          stealthMode,
          concurrency,
          crawlDepth,
          paginationLimit: isUnlimited ? 100 : paginationLimit,
          targetQuota: isUnlimited ? 0 : Number(targetQuota) || 100,
          isUnlimited: Boolean(isUnlimited),
          selectedFieldKeys: chosenFieldKeys,
          liveSyncToSheet,
          spreadsheetId: liveSyncToSheet ? spreadsheetId : undefined,
          sheetName: liveSyncToSheet ? sheetName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      // Background Execution: Close creation popup, do NOT force Open View modal
      setModalOpen(false);
      setCampaignName("");
      setDiscoveredAnalysis(null);
      setSelectedCampaign(null);
      setSuccessBanner(`🚀 Campaign "${data.campaign?.name || campaignName}" launched in background! Live progress is streaming below.`);
      fetchCampaigns();
    } catch (err: any) {
      alert(`Error creating campaign: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function applyTemplate(tpl: (typeof PRESET_TEMPLATES)[0]) {
    setCampaignName(tpl.name);
    setTargetUrlsInput(tpl.url);
    setCampaignType(tpl.type);
    setCrawlDepth(tpl.depth);
    setTargetQuota(tpl.quota);
    setIsUnlimited(Boolean(tpl.isUnlimited));
    setPaginationLimit(tpl.pagination);
    setDiscoveredAnalysis(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
      fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  }

  function exportCampaignCSV(camp: ScrapingCampaign) {
    const records = camp.extractedRecords || [];
    if (records.length === 0) {
      alert("No extracted records to export yet.");
      return;
    }

    const first = records[0];
    const headers = Object.keys(first);
    const rows = records.map((r) => headers.map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${camp.name.replace(/[^a-z0-9]/gi, "_")}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const runningCount = campaigns.filter((c) => c.status === "RUNNING").length;
  const totalExtracted = campaigns.reduce((acc, c) => acc + (c.successCount || c.extractedRecords?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Web Scraping & Multi-Level Crawlers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-step pagination, internal page schema discovery, and de-obfuscation engine powered by Playwright Stealth.
          </p>
        </div>

        <button
          onClick={() => {
            setModalOpen(true);
            setDiscoveredAnalysis(null);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Start New Campaign
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 font-bold p-1 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1-Click Preset Scraping Templates */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Ready-to-Use 1-Click B2B Directory Templates
          </h3>
          <span className="text-[11px] text-muted-foreground">Select a verified portal to launch in seconds</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <div
              key={tpl.name}
              onClick={() => applyTemplate(tpl)}
              className="p-3.5 bg-card hover:bg-muted/40 border border-border rounded-xl cursor-pointer transition-all hover:border-blue-500 hover:shadow-md group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {tpl.tag}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-blue-600" />
                </div>
                <h4 className="font-bold text-xs text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                  {tpl.name}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {tpl.desc}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Quota: {tpl.quota} items</span>
                <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                  Load Template <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">Total Campaigns</span>
          <span className="text-2xl font-bold text-foreground">{campaigns.length}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Configured multi-page pipelines</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">Active Running</span>
          <span className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            {runningCount}
            {runningCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-1">Headless Chromium fleets</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">Extracted Structured Records</span>
          <span className="text-2xl font-bold text-emerald-600">{totalExtracted}</span>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">Verified leads stored in MongoDB</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1">De-Obfuscation Engine</span>
          <span className="text-2xl font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Active
          </span>
          <span className="text-[11px] text-muted-foreground block mt-1">Unmasks title tags & JSON-LD</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active & Completed Campaigns ({campaigns.length})
          </h3>
          <button
            onClick={fetchCampaigns}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            <RotateCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Layers className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <h4 className="font-semibold text-sm text-foreground">No scraping campaigns launched yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Launch your first campaign with multi-level crawling, field selection, and de-obfuscation.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm transition-all"
            >
              + Create Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3">Campaign & Pipeline</th>
                  <th className="px-4 py-3">Target URL</th>
                  <th className="px-4 py-3">Crawl Depth</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Records Scraped</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name, Type & Live Background Progress */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{camp.name}</span>
                        {camp.status === "RUNNING" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold shrink-0">
                            <RotateCw className="w-2.5 h-2.5 animate-spin" /> {camp.progress}%
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono font-semibold inline-block mt-0.5">
                        {camp.type}
                      </span>
                      {camp.status === "RUNNING" && (
                        <div className="mt-1.5 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${camp.progress}%` }}
                          />
                        </div>
                      )}
                      {camp.logs && camp.logs.length > 0 && (
                        <span className="text-[10px] text-muted-foreground truncate block mt-1 font-mono">
                          {camp.logs[camp.logs.length - 1].message}
                        </span>
                      )}
                    </td>

                    {/* Target URL */}
                    <td className="px-4 py-3 text-muted-foreground font-mono truncate max-w-[200px]">
                      <a
                        href={camp.targetUrls[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-600 flex items-center gap-1"
                      >
                        {camp.targetUrls[0]} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </td>

                    {/* Crawl Depth */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-muted text-muted-foreground border border-border">
                        {camp.crawlDepth || "LEVEL_2_LISTINGS"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                          camp.status === "RUNNING"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse border border-blue-300 dark:border-blue-700"
                            : camp.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border"
                        }`}
                      >
                        {camp.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>}
                        {camp.status}
                      </span>
                    </td>

                    {/* Records Scraped */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-foreground text-sm">
                        {camp.extractedRecords?.length || camp.successCount || 0}
                      </span>
                      <span className="text-muted-foreground text-[11px]"> records</span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedCampaign(camp)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 shadow-sm ${
                          camp.status === "RUNNING"
                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                            : "bg-card hover:bg-muted text-foreground border-border"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" /> Open View
                      </button>
                      <button
                        onClick={() => handleDelete(camp.id || "")}
                        className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-muted"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POPUP MODAL: New Campaign Form with Level 1 Discovery & Field Selection */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Create Multi-Step Scraping Campaign</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              {/* Campaign Name */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Maharashtra Directory - Abrasives & Mechanical"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Target URLs & Level 1 Discovery Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">Target Website URL to Scrape</label>
                  <button
                    type="button"
                    onClick={() => setTargetUrlsInput("https://www.maharashtradirectory.com/")}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Load Sample (Maharashtra Directory)
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={targetUrlsInput}
                    onChange={(e) => setTargetUrlsInput(e.target.value)}
                    placeholder="https://www.maharashtradirectory.com/"
                    className="flex-1 font-mono p-2.5 bg-muted/40 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={inspecting}
                    onClick={handleInspectSite}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                  >
                    {inspecting ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Auditing Structure...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5" />
                        <span>Inspect & Discover Fields</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Clicking "Inspect & Discover Fields" explores the internal pages to discover all available fields and unmask hidden contacts.
                </span>
              </div>

              {/* LEVEL 1 DISCOVERY RESULTS & FIELD SELECTOR */}
              {discoveredAnalysis && (
                <div className="p-4 bg-muted/20 border border-blue-500/30 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Discovered Site Hierarchy & Internal Fields
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {discoveredAnalysis.siteArchetype}
                    </span>
                  </div>

                  {/* Hierarchy Breadcrumbs */}
                  <div className="p-2.5 bg-card border border-border rounded-lg text-[11px] space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Level 1 (Portal Root):</span>{" "}
                      <span className="font-mono text-muted-foreground">{discoveredAnalysis.siteTitle}</span>
                    </div>
                    {discoveredAnalysis.levelsFound?.level2 && (
                      <div className="font-semibold text-foreground flex items-center gap-1.5 pl-4">
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                        <span>Level 2 (Paginated Listings):</span>{" "}
                        <span className="font-mono text-muted-foreground">
                          {discoveredAnalysis.levelsFound.level2.totalCategoriesFound} Categories/Products Detected
                        </span>
                      </div>
                    )}
                    {discoveredAnalysis.levelsFound?.level3 && (
                      <div className="font-semibold text-foreground flex items-center gap-1.5 pl-8">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Level 3 (Company Detail Profile):</span>{" "}
                        <span className="font-mono text-emerald-600 font-bold">
                          {discoveredAnalysis.levelsFound.level3.sampleEntityName} (Schema.org JSON-LD unmasked)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* De-obfuscation / Unmasking Notes */}
                  {discoveredAnalysis.unmaskingNotes && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5">
                      <span className="font-bold block flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> De-Obfuscation Audit:
                      </span>
                      {discoveredAnalysis.unmaskingNotes.map((note: string, i: number) => (
                        <p key={i}>• {note}</p>
                      ))}
                    </div>
                  )}

                  {/* Field Selector Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        Select Target Fields to Extract ({Object.values(selectedFields).filter(Boolean).length} selected):
                      </span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleAllFields(true)}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                          type="button"
                          onClick={() => toggleAllFields(false)}
                          className="text-[11px] text-muted-foreground hover:underline"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {discoveredAnalysis.availableFields?.map((field: any) => {
                        const isChecked = selectedFields[field.id] !== false;
                        return (
                          <div
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`p-2 rounded-lg border cursor-pointer transition-all flex items-start gap-2 ${
                              isChecked
                                ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/30"
                                : "border-border bg-card opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleField(field.id)}
                              className="mt-0.5 rounded text-blue-600 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate">{field.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono block truncate">
                                Sample: {field.sampleValue}
                              </span>
                              <span className="text-[9px] text-blue-600 dark:text-blue-400 block mt-0.5">
                                {field.unmaskingStrategy}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Level Crawl Depth Selector */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Multi-Level Crawling Depth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "LEVEL_1_DIRECT",
                      label: "Level 1: Direct Page",
                      desc: "Current URL only (Single page extraction)",
                    },
                    {
                      id: "LEVEL_2_LISTINGS",
                      label: "Level 2: Category & Listings",
                      desc: "Follows categories & paginates listing cards",
                    },
                    {
                      id: "LEVEL_3_DEEP_DETAILS",
                      label: "Level 3: Deep Profiles",
                      desc: "Visits company detail pages for Schema.org",
                    },
                  ].map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setCrawlDepth(d.id as any)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        crawlDepth === d.id
                          ? "border-blue-600 bg-blue-50/10 font-semibold text-blue-700 dark:text-blue-300"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <span className="block text-xs font-bold text-foreground">{d.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">{d.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unlimited Full Database Crawling Mode */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isUnlimited
                    ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/20 shadow-sm"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsUnlimited(checked);
                      if (checked) {
                        setTargetQuota(0);
                        setPaginationLimit(100);
                      } else {
                        setTargetQuota(50000);
                        setPaginationLimit(25);
                      }
                    }}
                    className="mt-0.5 rounded text-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">
                        ♾️ Extract Entire Database (Unlimited / Crawl All Categories & Subcategories)
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isUnlimited
                            ? "bg-purple-600 text-white"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {isUnlimited ? "UNLIMITED ACTIVE" : "OPTIONAL"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Removes all quota limits. Continuously navigates all 96 industrial subcategories, traverses all 26 alphabetical indexes (A-Z), and deep crawls paginated cards until the entire directory is extracted into Central Intelligence (MongoDB Atlas).
                    </p>
                  </div>
                </label>
              </div>

              {/* Target Quota, Pagination Limit & Concurrency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-foreground text-xs">
                      Target Quota (Verified Leads)
                    </label>
                    {isUnlimited && (
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                        ♾️ Unlimited
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    step={50}
                    disabled={isUnlimited}
                    value={isUnlimited ? "" : targetQuota}
                    placeholder={isUnlimited ? "Unlimited (Crawl All)" : "e.g. 50000"}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTargetQuota(isNaN(val) ? 0 : val);
                    }}
                    className={`w-full p-2 bg-muted/40 border border-border rounded-lg font-mono text-xs ${
                      isUnlimited ? "opacity-60 cursor-not-allowed bg-muted/20" : ""
                    }`}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[500, 1000, 5000, 10000, 50000, 100000].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setIsUnlimited(false);
                          setTargetQuota(q);
                        }}
                        className={`px-1.5 py-0.5 text-[9px] rounded border font-mono transition-colors ${
                          !isUnlimited && targetQuota === q
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {q >= 1000 ? `${q / 1000}k` : q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUnlimited(true);
                        setTargetQuota(0);
                      }}
                      className={`px-1.5 py-0.5 text-[9px] rounded border font-mono font-bold transition-colors ${
                        isUnlimited
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-muted text-purple-600 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950"
                      }`}
                    >
                      ♾️ All
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-foreground text-xs">
                      Pagination Depth (Pages/Cat)
                    </label>
                    <span className="text-[10px] text-muted-foreground">Deep Catalog</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={paginationLimit}
                    onChange={(e) => setPaginationLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 bg-muted/40 border border-border rounded-lg font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[5, 10, 25, 50, 100, 250].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginationLimit(p)}
                        className={`px-1.5 py-0.5 text-[9px] rounded border font-mono transition-colors ${
                          paginationLimit === p
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {p}p
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-foreground text-xs">
                      Worker Concurrency
                    </label>
                    <span className="text-[10px] text-muted-foreground">Parallel threads</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 bg-muted/40 border border-border rounded-lg font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[1, 2, 3, 5, 8].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConcurrency(c)}
                        className={`px-1.5 py-0.5 text-[9px] rounded border font-mono transition-colors ${
                          concurrency === c
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {c}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stealth Anti-Bot Switch */}
              <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stealthMode}
                    onChange={(e) => setStealthMode(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Playwright Stealth Mode (Anti-403 & Cloudflare Bypass)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Bypasses Cloudflare WAF, removing navigator.webdriver and loading legitimate Chrome signatures.
                    </span>
                  </div>
                </label>
              </div>

              {/* Google Sheets Destination */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={liveSyncToSheet}
                    onChange={(e) => setLiveSyncToSheet(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <Sheet className="w-4 h-4 text-emerald-600" />
                  <span>Stream Extracted Records Live to Google Sheet</span>
                </label>

                {liveSyncToSheet && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Spreadsheet ID"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      className="p-2 bg-muted/40 border border-border rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Sheet Tab (Sheet1)"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      className="p-2 bg-muted/40 border border-border rounded-lg font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Launching Crawler...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Scraping Campaign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPEN VIEW DRAWER / MODAL: Campaign Live Details & Records */}
      {selectedCampaign && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCampaign(null);
          }}
        >
          <div className="bg-card border border-border rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">{selectedCampaign.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      selectedCampaign.status === "RUNNING"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse"
                        : selectedCampaign.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedCampaign.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                    {selectedCampaign.crawlDepth || "LEVEL_2_LISTINGS"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-lg">
                  Target: {selectedCampaign.targetUrls.join(", ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCampaignCSV(selectedCampaign)}
                  className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 transition-all shadow-sm"
                >
                  ✕ Close View <span className="text-[10px] text-muted-foreground font-mono font-normal">(Esc)</span>
                </button>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress: {selectedCampaign.progress}%</span>
                <span>
                  Extracted: {selectedCampaign.extractedRecords?.length || selectedCampaign.successCount || 0} items
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${selectedCampaign.progress}%` }}
                />
              </div>
            </div>

            {/* Extracted Records Table */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Extracted Structured Records ({selectedCampaign.extractedRecords?.length || 0})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  De-obfuscated decision makers & verified factory addresses
                </span>
              </div>

              {!selectedCampaign.extractedRecords || selectedCampaign.extractedRecords.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  {selectedCampaign.status === "RUNNING" ? (
                    <div className="flex flex-col items-center gap-2">
                      <RotateCw className="w-5 h-5 text-blue-600 animate-spin" />
                      <span>Playwright Stealth worker is executing multi-level crawling & unmasking...</span>
                    </div>
                  ) : (
                    <span>No records extracted yet.</span>
                  )}
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Company Name</th>
                        <th className="px-3 py-2">Decision Maker & Role</th>
                        <th className="px-3 py-2">Phone / Mobile</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Address & Location</th>
                        <th className="px-3 py-2">Products</th>
                        <th className="px-3 py-2">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-[11px]">
                      {selectedCampaign.extractedRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {/* Company Name */}
                          <td className="px-3 py-2 font-bold text-foreground">
                            {r.companyName || r.name || "-"}
                          </td>

                          {/* Contact Person & Designation */}
                          <td className="px-3 py-2">
                            <span className="font-semibold text-foreground block">
                              {r.contactPerson || "-"}
                            </span>
                            {r.designation && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {r.designation}
                              </span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-3 py-2 font-mono text-muted-foreground">
                            {r.phone ? (
                              <span className={r.phone.includes("Protected") ? "text-amber-600 dark:text-amber-400 text-[10px]" : "text-foreground font-semibold"}>
                                {r.phone}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* Email */}
                          <td className="px-3 py-2 font-mono text-blue-600">
                            {r.email || "-"}
                          </td>

                          {/* Address */}
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]" title={r.fullAddress || r.address}>
                            {r.fullAddress || r.address || "-"}
                          </td>

                          {/* Products */}
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]" title={r.products}>
                            {r.products || "-"}
                          </td>

                          {/* Source Link */}
                          <td className="px-3 py-2">
                            {r.companyInfoUrl || r.link ? (
                              <a
                                href={r.companyInfoUrl || r.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Live Worker Logs */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" /> Real-Time Crawler Telemetry Stream
                </span>
                <div className="bg-zinc-950 text-zinc-300 p-3 rounded-xl font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 border border-zinc-800">
                  {!selectedCampaign.logs || selectedCampaign.logs.length === 0 ? (
                    <div className="text-zinc-600 italic">Waiting for crawler telemetry...</div>
                  ) : (
                    selectedCampaign.logs.map((log, i) => (
                      <div key={i} className="leading-relaxed">
                        <span className="text-zinc-500">[{log.timestamp.slice(11, 19)}]</span>{" "}
                        <span
                          className={
                            log.level === "success"
                              ? "text-emerald-400 font-bold"
                              : log.level === "error"
                              ? "text-red-400 font-bold"
                              : "text-blue-400"
                          }
                        >
                          [{log.level.toUpperCase()}]
                        </span>{" "}
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-border gap-3 mt-auto shrink-0">
              <div className="text-xs text-muted-foreground">
                Extracted{" "}
                <span className="font-bold text-foreground">
                  {selectedCampaign.extractedRecords?.length || selectedCampaign.successCount || 0}
                </span>{" "}
                verified records. Central database auto-enrichment active in background.
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  href="/data-explorer"
                  className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 text-foreground transition-all"
                >
                  <Database className="w-3.5 h-3.5 text-blue-600" /> Explore Central Database
                </Link>
                <button
                  onClick={() => exportCampaignCSV(selectedCampaign)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
