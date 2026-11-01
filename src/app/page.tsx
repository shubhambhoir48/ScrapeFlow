"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Cpu,
  Sheet,
  ArrowUpRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Star,
  PlusCircle,
} from "lucide-react";
import { Company } from "@/core/models/Company";
import { ScrapingJob } from "@/core/models/Job";
import { Person } from "@/core/models/Person";
import { Users } from "lucide-react";

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [totalPeople, setTotalPeople] = useState(0);
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [compRes, peopleRes, jobsRes] = await Promise.all([
        fetch("/api/companies?limit=6").then((r) => r.json()),
        fetch("/api/people?limit=6").then((r) => r.json()),
        fetch("/api/jobs").then((r) => r.json()),
      ]);
      setCompanies(compRes.items || []);
      setTotalCompanies(compRes.total ?? compRes.items?.length ?? 0);
      setPeople(peopleRes.items || []);
      setTotalPeople(peopleRes.total ?? peopleRes.items?.length ?? 0);
      setJobs(jobsRes.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalVerified = companies.filter((c) => c.verificationStatus === "VERIFIED").length;
  const activeJobs = jobs.filter((j) => j.status === "RUNNING");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-xl shadow-blue-950/20">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-300">
            Autonomous Enrichment Engine
          </span>
          <h2 className="text-2xl font-bold mt-1 tracking-tight">
            Company Intelligence & Web Scraping Hub
          </h2>
          <p className="text-sm text-blue-100/80 mt-1 max-w-2xl">
            Continuously extract and verify company websites, Google Maps profiles, social handles, and MX records—live streaming directly into Google Sheets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Start Scraping Campaign
          </Link>
          <Link
            href="/smart-scraper"
            className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl border border-blue-700 transition-all flex items-center gap-2"
          >
            Inspect Website <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Organizations Enriched</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalCompanies}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> High-fidelity database
          </p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Decision Makers (People)</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalPeople}
          </div>
          <p className="text-xs text-blue-600 font-medium mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified C-Suite & Founders
          </p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Active Background Tasks</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {activeJobs.length}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Continuous queue ready
          </p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Google Sheets Live Sync</span>
            <Sheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            Connected
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1.5">
            Bi-directional streaming
          </p>
        </div>
      </div>

      {/* Main Grid: Active Queue & Recently Enriched */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Jobs Widget */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" /> Continuous Worker Queue
            </h3>
            <Link href="/jobs" className="text-xs text-blue-600 hover:underline">
              All Jobs
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No tasks currently running in background.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 4).map((job) => (
                <div key={job.id} className="p-3 bg-muted/50 rounded-lg border border-border/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate max-w-[170px]">{job.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        job.status === "RUNNING"
                          ? "bg-blue-100 text-blue-700 animate-pulse"
                          : job.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 transition-all duration-300 rounded-full"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{job.processedItems} / {job.totalItems} processed</span>
                    <span>{job.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Enriched Companies */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Recent Company Intelligence
            </h3>
            <Link href="/data-explorer" className="text-xs text-blue-600 hover:underline">
              Open Data Explorer
            </Link>
          </div>

          {companies.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Search className="w-6 h-6 mx-auto text-muted-foreground/60" />
              <p>No enriched company data yet.</p>
              <Link
                href="/campaigns"
                className="inline-block mt-2 text-xs font-semibold text-blue-600 hover:underline"
              >
                Launch your first scraping campaign →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-md">Company</th>
                    <th className="px-3 py-2.5">Domain</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Verified Email</th>
                    <th className="px-3 py-2.5">Maps Rating</th>
                    <th className="px-3 py-2.5 rounded-r-md">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map((c) => (
                    <tr key={c._id || c.domain} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-3 font-semibold text-foreground">
                        {c.companyName}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <a
                          href={c.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-blue-600 flex items-center gap-1"
                        >
                          {c.domain} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {c.phones[0]?.number || "-"}
                      </td>
                      <td className="px-3 py-3">
                        {c.emails[0] ? (
                          <span className="font-mono text-[11px] text-foreground">
                            {c.emails[0].address}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.googleMaps?.rating ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {c.googleMaps.rating}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.verificationStatus === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.verificationStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {c.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

