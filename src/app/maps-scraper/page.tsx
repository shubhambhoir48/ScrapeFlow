"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
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
  Database,
  Sheet,
  Sparkles,
  ChevronRight,
  Eye,
  X,
  Star,
  Phone,
  Compass,
  FileSpreadsheet,
  Filter,
  Check,
} from "lucide-react";
import { ScrapingCampaign } from "@/core/models/Campaign";

export default function MapsScraperPage() {
  const [campaigns, setCampaigns] = useState<ScrapingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // New Maps Campaign Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [query, setQuery] = useState("CNC Machining Companies");
  const [category, setCategory] = useState("Manufacturer");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Maharashtra");
  const [city, setCity] = useState("Thane");
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [minReviews, setMinReviews] = useState<number | undefined>(undefined);
  const [mustHavePhone, setMustHavePhone] = useState(false);
  const [mustHaveWebsite, setMustHaveWebsite] = useState(false);
  const [limit, setLimit] = useState(25);
  const [liveSyncToSheet, setLiveSyncToSheet] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Open View Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<ScrapingCampaign | null>(null);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      const mapsOnly = (data.campaigns || []).filter((c: ScrapingCampaign) => c.type === "GOOGLE_MAPS");
      setCampaigns(mapsOnly);

      if (selectedCampaign) {
        const updated = mapsOnly.find((c: ScrapingCampaign) => c.id === selectedCampaign.id);
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

  function applyPreset(presetQuery: string, presetCat: string, presetCity: string, presetState: string) {
    setQuery(presetQuery);
    setCategory(presetCat);
    setCity(presetCity);
    setState(presetState);
    setCampaignName(`${presetQuery} in ${presetCity}`);
    setModalOpen(true);
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName.trim() || !query.trim()) {
      alert("Please provide a campaign name and search query.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          type: "GOOGLE_MAPS",
          targetUrls: [`https://www.google.com/maps/search/${encodeURIComponent(`${query} in ${city}, ${state}`)}`],
          engine: "PLAYWRIGHT_STEALTH",
          stealthMode: true,
          mapsQuery: query.trim(),
          mapsCategory: category.trim() || undefined,
          mapsCountry: country.trim() || "India",
          mapsState: state.trim() || undefined,
          mapsCity: city.trim() || undefined,
          mapsMinRating: minRating,
          mapsMinReviews: minReviews,
          mapsHasPhone: mustHavePhone,
          mapsHasWebsite: mustHaveWebsite,
          mapsLimit: limit,
          liveSyncToSheet,
          spreadsheetId: liveSyncToSheet ? spreadsheetId : undefined,
          sheetName: liveSyncToSheet ? sheetName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      // Background execution: Close creation popup, do NOT force open view modal
      setModalOpen(false);
      setCampaignName("");
      setSelectedCampaign(null);
      setSuccessBanner(`🚀 Google Maps campaign "${data.campaign?.name || campaignName}" launched in background! Live progress is streaming below.`);
      fetchCampaigns();
    } catch (err: any) {
      alert(`Error creating Google Maps campaign: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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

  function exportCSV(camp: ScrapingCampaign) {
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
    link.setAttribute("download", `${camp.name.replace(/[^a-z0-9]/gi, "_")}_places.csv`);
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
            <MapPin className="w-5 h-5 text-amber-500" /> Google Maps Places & Business Intelligence Scraper
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Extract high-fidelity local businesses, direct unmasked phone numbers, star ratings, operating hours, and corporate domains by location and category.
          </p>
        </div>

        <button
          onClick={() => {
            setCampaignName(`Google Maps: ${query} in ${city}`);
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> New Maps Campaign
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Active Background Tasks</span>
            <RotateCw className={`w-4 h-4 text-blue-600 ${runningCount > 0 ? "animate-spin" : ""}`} />
          </div>
          <div className="text-2xl font-bold text-foreground">{runningCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Autonomous workers processing</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Places Harvested</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalExtracted}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Persisted in MongoDB Atlas</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Maps Campaigns</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{campaigns.length}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Managed pipelines</p>
        </div>
      </div>

      {/* Quick Launch Preset Cards */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> One-Click Preset Campaigns
          </h3>
          <span className="text-[11px] text-muted-foreground">Click to preload filters & launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: "CNC Machining in Thane",
              query: "CNC Machining Companies",
              cat: "Manufacturer",
              city: "Thane",
              state: "Maharashtra",
            },
            {
              title: "Chemical Plants in Mumbai",
              query: "Chemical Manufacturers",
              cat: "Chemical Industry",
              city: "Mumbai",
              state: "Maharashtra",
            },
            {
              title: "Hardware Exporters in Gujarat",
              query: "Hardware & Fasteners Exporters",
              cat: "Exporters",
              city: "Ahmedabad",
              state: "Gujarat",
            },
            {
              title: "Tech IT Firms in Bengaluru",
              query: "Software Development Companies",
              cat: "IT Services",
              city: "Bengaluru",
              state: "Karnataka",
            },
          ].map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(preset.query, preset.cat, preset.city, preset.state)}
              className="p-3 bg-muted/30 hover:bg-muted/60 border border-border rounded-lg text-left transition-all space-y-1 hover:border-blue-500/40"
            >
              <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                <span>{preset.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {preset.city}, {preset.state} • {preset.cat}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" /> Google Maps Campaigns ({campaigns.length})
          </h3>
          <button onClick={fetchCampaigns} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <MapPin className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-foreground">No Google Maps Campaigns Created Yet</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Launch your first Google Maps scraping campaign to extract business names, unmasked phone numbers, star ratings, and corporate websites.
            </p>
            <button
              onClick={() => {
                setCampaignName(`Google Maps: ${query} in ${city}`);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all inline-flex items-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Create Maps Campaign
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((camp) => {
              const count = camp.extractedRecords?.length || camp.successCount || 0;
              return (
                <div key={camp.id} className="p-4 hover:bg-muted/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{camp.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          camp.status === "RUNNING"
                            ? "bg-blue-100 text-blue-700 animate-pulse"
                            : camp.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {camp.status}
                      </span>
                      {camp.mapsCity && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-muted font-medium text-muted-foreground">
                          {camp.mapsCity}, {camp.mapsState || camp.mapsCountry}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Query: <strong className="text-foreground">{camp.mapsQuery || camp.name}</strong></span>
                      <span>•</span>
                      <span>Harvested: <strong className="text-emerald-600 font-bold">{count} places</strong></span>
                      {camp.mapsMinRating && (
                        <>
                          <span>•</span>
                          <span>Min: <strong>{camp.mapsMinRating}★</strong></span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 transition-all duration-300 rounded-full"
                        style={{ width: `${camp.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      onClick={() => setSelectedCampaign(camp)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Open View
                    </button>
                    <button
                      onClick={() => exportCSV(camp)}
                      disabled={count === 0}
                      className="p-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg disabled:opacity-40 transition-all"
                      title="Export CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(camp.id!)}
                      className="p-1.5 bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600 border border-border rounded-lg transition-all"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: NEW GOOGLE MAPS CAMPAIGN FORM                   */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" /> Launch Google Maps Scraping Pipeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Runs asynchronously in the background. Results stream to MongoDB Atlas & Data Explorer.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Pune Automotive Parts Suppliers"
                  className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Query & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Search Query / Keywords *
                  </label>
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. CNC Machine Manufacturers"
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Business Category / Industry
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Manufacturer, Wholesaler, Clinic"
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  />
                </div>
              </div>

              {/* Geographic Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">City / District *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Thane, Mumbai, Pune"
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">State / Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra, Gujarat"
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India, USA, UK"
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  />
                </div>
              </div>

              {/* Quality & Filtering Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Minimum Rating</label>
                  <select
                    value={minRating || ""}
                    onChange={(e) => setMinRating(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  >
                    <option value="">Any Rating</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Minimum Reviews</label>
                  <select
                    value={minReviews || ""}
                    onChange={(e) => setMinReviews(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg"
                  >
                    <option value="">Any Count</option>
                    <option value="5">5+ Reviews</option>
                    <option value="20">20+ Reviews</option>
                    <option value="50">50+ Reviews</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">Target Places Quota</label>
                    <span className="text-[10px] text-muted-foreground font-mono">No Cap</span>
                  </div>
                  <input
                    type="number"
                    min={5}
                    value={limit}
                    placeholder="e.g. 500, 1000, 5000"
                    onChange={(e) => setLimit(parseInt(e.target.value, 10) || 25)}
                    className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg font-mono"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[25, 50, 100, 250, 500, 1000, 2500].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setLimit(q)}
                        className={`px-1.5 py-0.5 text-[9px] rounded border font-mono transition-colors ${
                          limit === q
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {q >= 1000 ? `${q / 1000}k` : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Availability Checkboxes */}
              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={mustHavePhone}
                    onChange={(e) => setMustHavePhone(e.target.checked)}
                    className="rounded border-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Must have Phone Number</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={mustHaveWebsite}
                    onChange={(e) => setMustHaveWebsite(e.target.checked)}
                    className="rounded border-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Must have Official Website</span>
                </label>
              </div>

              {/* Google Sheets Sync */}
              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liveSyncToSheet}
                    onChange={(e) => setLiveSyncToSheet(e.target.checked)}
                    className="rounded border-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <Sheet className="w-4 h-4 text-emerald-600" />
                  <span>Stream Google Maps leads live to Google Sheets</span>
                </label>

                {liveSyncToSheet && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <input
                        type="text"
                        placeholder="Google Spreadsheet ID"
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        className="w-full text-xs p-2 bg-card border border-border rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Sheet Tab Name (e.g. Sheet1)"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        className="w-full text-xs p-2 bg-card border border-border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted font-medium text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Launching...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" /> Launch Scraper in Background
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: OPEN VIEW MODAL (LIVE TELEMETRY & RECORDS)      */}
      {/* ======================================================== */}
      {selectedCampaign && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCampaign(null);
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-5xl shadow-2xl p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base text-foreground">{selectedCampaign.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      selectedCampaign.status === "RUNNING"
                        ? "bg-blue-100 text-blue-700 animate-pulse"
                        : selectedCampaign.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedCampaign.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {selectedCampaign.mapsQuery} in {selectedCampaign.mapsCity}, {selectedCampaign.mapsCountry}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCSV(selectedCampaign)}
                  disabled={(selectedCampaign.extractedRecords?.length || 0) === 0}
                  className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
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

            {/* Content Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Progress & Stat Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    Scraping Progress: {selectedCampaign.progress}%
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Harvested: {selectedCampaign.extractedRecords?.length || selectedCampaign.successCount || 0} places
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${selectedCampaign.progress}%` }}
                  />
                </div>
              </div>

              {/* Extracted Structured Records Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Extracted Local Businesses ({selectedCampaign.extractedRecords?.length || 0})
                </h4>

                {(selectedCampaign.extractedRecords || []).length === 0 ? (
                  <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                    Crawler running... records will appear live as Google Maps feeds are traversed.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5">Business Name</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Rating & Reviews</th>
                          <th className="px-3 py-2.5">Direct Phone</th>
                          <th className="px-3 py-2.5">Address</th>
                          <th className="px-3 py-2.5">Website</th>
                          <th className="px-3 py-2.5">Maps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-[11px]">
                        {(selectedCampaign.extractedRecords || []).map((r, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-bold text-foreground max-w-[200px] truncate" title={r.name || r.companyName}>
                              {r.name || r.companyName}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              <span className="px-1.5 py-0.5 rounded bg-muted font-medium text-[10px]">
                                {r.category || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {r.rating && r.rating !== "-" ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  {r.rating} ({r.reviews || 0})
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-emerald-600">
                              {r.phone && r.phone !== "-" ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {r.phone}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[220px] truncate" title={r.address}>
                              {r.address || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {r.website && r.website !== "-" ? (
                                <a
                                  href={r.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[140px]"
                                >
                                  {r.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]}
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {r.mapsUrl ? (
                                <a
                                  href={r.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-600 hover:underline flex items-center gap-1"
                                >
                                  Map <ExternalLink className="w-2.5 h-2.5" />
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
              </div>

              {/* Real-Time Live Execution Stream Terminal */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" /> Worker Execution Stream
                </h4>
                <div className="bg-zinc-950 text-zinc-300 font-mono text-[11px] p-3.5 rounded-xl border border-zinc-800 max-h-48 overflow-y-auto space-y-1">
                  {(selectedCampaign.logs || []).length === 0 ? (
                    <p className="text-zinc-500">Worker standing by...</p>
                  ) : (
                    selectedCampaign.logs?.map((l, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-zinc-500 text-[10px]">[{l.timestamp?.slice(11, 19)}]</span>
                        <span
                          className={`font-semibold uppercase text-[10px] ${
                            l.level === "success"
                              ? "text-emerald-400"
                              : l.level === "error"
                              ? "text-red-400"
                              : l.level === "warn"
                              ? "text-amber-400"
                              : "text-blue-400"
                          }`}
                        >
                          [{l.level}]
                        </span>
                        <span className="text-zinc-200">{l.message}</span>
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
                Google Maps places. Persisted to MongoDB Atlas.
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  href="/data-explorer"
                  className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 text-foreground transition-all"
                >
                  <Database className="w-3.5 h-3.5 text-blue-600" /> Explore Central Database
                </Link>
                <button
                  onClick={() => exportCSV(selectedCampaign)}
                  disabled={(selectedCampaign.extractedRecords?.length || 0) === 0}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
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

