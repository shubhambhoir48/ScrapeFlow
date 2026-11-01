"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Share2,
  Search,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Github,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Database,
  Download,
  Terminal,
  Sparkles,
  Users,
  Building2,
  Zap,
} from "lucide-react";

export default function SocialScraperPage() {
  const [targetName, setTargetName] = useState("Mr. Jatin Shah");
  const [companyOrDomain, setCompanyOrDomain] = useState("Jatin Engineering Company");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [logs, setLogs] = useState<{ level: string; message: string }[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  async function handleRunSingle() {
    if (!targetName.trim()) return;
    setRunning(true);
    setResult(null);
    setLogs([]);

    try {
      const res = await fetch("/api/social-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: targetName.trim(),
          companyOrDomain: companyOrDomain.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to audit social profiles");
      setResult(data.result);
      setLogs(data.logs || []);
    } catch (e: any) {
      alert(`Social audit error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleBatchAuditAtlas() {
    setBatchRunning(true);
    try {
      // 1. Fetch top companies from MongoDB Atlas
      const cRes = await fetch("/api/companies?limit=8");
      const cData = await cRes.json();
      const companies = cData.items || [];

      if (companies.length === 0) {
        alert("No companies found in MongoDB Atlas to audit.");
        return;
      }

      const targets = companies.map((c: any) => ({
        recordId: c.id,
        recordType: "COMPANY",
        name: c.companyName,
        company: c.domain || c.websiteUrl || c.companyName,
      }));

      const res = await fetch("/api/social-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch audit failed");

      setBatchResults(data.results || []);
      alert(`Successfully audited and updated ${data.results?.length || 0} companies in MongoDB Atlas!`);
    } catch (e: any) {
      alert(`Batch audit error: ${e.message}`);
    } finally {
      setBatchRunning(false);
    }
  }

  function exportCSV() {
    const list = batchResults.length > 0 ? batchResults : result ? [result] : [];
    if (list.length === 0) return;

    const headers = ["Target Name", "Company", "LinkedIn", "Twitter", "Facebook", "Instagram", "Confidence Score", "Sources"];
    const rows = list.map((r) => [
      `"${r.targetName || ""}"`,
      `"${r.targetCompany || ""}"`,
      `"${r.linkedin || ""}"`,
      `"${r.twitter || ""}"`,
      `"${r.facebook || ""}"`,
      `"${r.instagram || ""}"`,
      `"${(r.confidenceScore * 100).toFixed(0)}%"`,
      `"${(r.sourcesFound || []).join("; ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `social_media_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" /> Multi-Channel Social Media Scraper
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-references LinkedIn, Twitter/X, Facebook, and Instagram for companies & executive decision makers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchAuditAtlas}
            disabled={batchRunning}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            {batchRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Auto-Audit All Atlas Leads
          </button>
          <Link
            href="/data-explorer"
            className="px-3.5 py-2 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" /> View in Central Database
          </Link>
        </div>
      </div>

      {/* Input Box & Audit Controls */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Targeted Social Entity Lookup
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">Bypasses Cloudflare & Search WAF</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Person or Business Name
            </label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="e.g. Delzad Karani or Farohar Engineering"
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">
              Company Name, Domain or Official Website (Optional)
            </label>
            <input
              type="text"
              value={companyOrDomain}
              onChange={(e) => setCompanyOrDomain(e.target.value)}
              placeholder="e.g. farohar.in or Mumbai"
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Social Platforms Coverage Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Supported Channels:</span>
          {[
            { name: "LinkedIn", icon: Linkedin, color: "text-blue-600 border-blue-500/20 bg-blue-500/10" },
            { name: "Twitter / X", icon: Twitter, color: "text-sky-500 border-sky-500/20 bg-sky-500/10" },
            { name: "Facebook", icon: Facebook, color: "text-indigo-600 border-indigo-500/20 bg-indigo-500/10" },
            { name: "Instagram", icon: Instagram, color: "text-pink-600 border-pink-500/20 bg-pink-500/10" },
            { name: "YouTube", icon: Youtube, color: "text-red-600 border-red-500/20 bg-red-500/10" },
            { name: "GitHub", icon: Github, color: "text-zinc-600 border-zinc-500/20 bg-zinc-500/10" },
          ].map((ch) => (
            <span
              key={ch.name}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${ch.color}`}
            >
              <ch.icon className="w-3.5 h-3.5" /> {ch.name}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted-foreground">
            Crawls official websites and searches digital footprints across social platforms.
          </span>
          <button
            onClick={handleRunSingle}
            disabled={running || !targetName.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            {running ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Crawling Social Channels...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" /> Execute Social Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discovered Result Card */}
      {result && (
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-sm shadow-sm">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  {result.targetName}
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    Confidence: {(result.confidenceScore * 100).toFixed(0)}%
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono">{result.targetCompany || "Verified Lead"}</p>
              </div>
            </div>

            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export Result
            </button>
          </div>

          {/* Social Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* LinkedIn */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn
                </span>
                {result.linkedin ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.linkedin ? (
                <a
                  href={result.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.linkedin}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>

            {/* Twitter */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Twitter className="w-4 h-4 text-sky-500" /> Twitter / X
                </span>
                {result.twitter ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.twitter ? (
                <a
                  href={result.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.twitter}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>

            {/* Facebook */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Facebook className="w-4 h-4 text-indigo-600" /> Facebook
                </span>
                {result.facebook ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.facebook ? (
                <a
                  href={result.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.facebook}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>

            {/* Instagram */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-600" /> Instagram
                </span>
                {result.instagram ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.instagram ? (
                <a
                  href={result.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.instagram}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>

            {/* YouTube */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-600" /> YouTube
                </span>
                {result.youtube ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.youtube ? (
                <a
                  href={result.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.youtube}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>

            {/* GitHub */}
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-zinc-600" /> GitHub
                </span>
                {result.github ? (
                  <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not found</span>
                )}
              </div>
              {result.github ? (
                <a
                  href={result.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block font-mono"
                >
                  {result.github}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/60 block">-</span>
              )}
            </div>
          </div>

          {/* Sources breakdown */}
          {result.sourcesFound && result.sourcesFound.length > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-bold block mb-0.5 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Unmasking Evidence & Verification Sources:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {result.sourcesFound.map((src: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-semibold">
                    ✓ {src}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Results Table if run */}
      {batchResults.length > 0 && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Batch Discovered Social Profiles ({batchResults.length})
            </h3>
            <button
              onClick={exportCSV}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3 h-3" /> Export All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Company / Name</th>
                  <th className="px-4 py-2.5">LinkedIn</th>
                  <th className="px-4 py-2.5">Twitter / X</th>
                  <th className="px-4 py-2.5">Facebook</th>
                  <th className="px-4 py-2.5">Confidence</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batchResults.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-bold text-foreground">{r.targetName}</td>
                    <td className="px-4 py-3">
                      {r.linkedin ? (
                        <a href={r.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]">
                          <Linkedin className="w-3 h-3" /> Profile <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.twitter ? (
                        <a href={r.twitter} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline flex items-center gap-1 font-mono text-[11px]">
                          <Twitter className="w-3 h-3" /> Handle <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.facebook ? (
                        <a href={r.facebook} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-[11px]">
                          <Facebook className="w-3 h-3" /> Page <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {(r.confidenceScore * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href="/data-explorer" className="text-blue-600 hover:underline font-semibold">
                        View in Grid
                      </Link>
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

