"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Cpu,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Terminal,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { ScrapingJob } from "@/core/models/Job";
import { formatDate } from "@/lib/utils";

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ScrapingJob | null>(null);

  async function fetchJobs() {
    try {
      const res = await fetch(`/api/jobs?userId=${user?.uid || ""}`, {
        headers: {
          "x-user-id": user?.uid || "",
          "x-user-email": user?.email || "",
        },
      });
      const data = await res.json();
      setJobs(data.jobs || []);
      if (selectedJob) {
        const updated = data.jobs?.find((j: ScrapingJob) => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      } else if (data.jobs && data.jobs.length > 0) {
        setSelectedJob(data.jobs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [selectedJob?.id]);

  async function handleJobAction(jobId: string, action: "pause" | "resume" | "cancel") {
    try {
      await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action }),
      });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" /> Background Worker Fleet & Queue Monitor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status of continuous scraping pipelines, worker thread utilization, and live log streaming.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          className="p-2 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Jobs List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active & Historical Jobs ({jobs.length})
          </h3>

          {jobs.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-xs text-muted-foreground">
              No scraping jobs created yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/10 shadow-sm"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[170px]">
                        {job.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          job.status === "RUNNING"
                            ? "bg-blue-100 text-blue-700 animate-pulse"
                            : job.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : job.status === "PAUSED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 transition-all duration-300 rounded-full"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{job.processedItems} / {job.totalItems} items</span>
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Job Detail & Live Logs */}
        <div className="lg:col-span-2 space-y-4">
          {selectedJob ? (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedJob.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>Task ID: <code className="font-mono">{selectedJob.id}</code></span>
                    <span>•</span>
                    <span>Started: {formatDate(selectedJob.createdAt)}</span>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="flex items-center gap-2">
                  {selectedJob.status === "RUNNING" && (
                    <button
                      onClick={() => handleJobAction(selectedJob.id, "pause")}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-amber-500/30 transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {selectedJob.status === "PAUSED" && (
                    <button
                      onClick={() => handleJobAction(selectedJob.id, "resume")}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-blue-500/30 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {selectedJob.status !== "COMPLETED" && selectedJob.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleJobAction(selectedJob.id, "cancel")}
                      className="px-3 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-red-500/30 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-muted-foreground text-[11px] block">Total Targets</span>
                  <span className="text-lg font-bold text-foreground">{selectedJob.totalItems}</span>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-700 text-[11px] block">Successful</span>
                  <span className="text-lg font-bold text-emerald-600">{selectedJob.successfulItems}</span>
                </div>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <span className="text-red-700 text-[11px] block">Failed / Skipped</span>
                  <span className="text-lg font-bold text-red-600">{selectedJob.failedItems}</span>
                </div>
              </div>

              {/* Live Terminal Output */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-600" /> Worker Execution Stream
                  </span>
                  <span>{selectedJob.logs.length} Log Entries</span>
                </div>

                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-xs max-h-72 overflow-y-auto space-y-1.5 border border-zinc-800">
                  {selectedJob.logs.length === 0 ? (
                    <div className="text-zinc-600 italic">No log entries available.</div>
                  ) : (
                    selectedJob.logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-zinc-500 shrink-0">
                          {log.timestamp.slice(11, 19)}
                        </span>
                        <span
                          className={`shrink-0 ${
                            log.level === "success"
                              ? "text-emerald-400 font-bold"
                              : log.level === "error"
                              ? "text-red-400 font-bold"
                              : log.level === "warn"
                              ? "text-amber-400 font-bold"
                              : "text-blue-400"
                          }`}
                        >
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-zinc-200">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-xs text-muted-foreground">
              Select a scraping job to view live worker telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

