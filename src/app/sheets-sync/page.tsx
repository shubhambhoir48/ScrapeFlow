"use client";

import { useState } from "react";
import {
  Sheet,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  ExternalLink,
  ArrowRightLeft,
  ListPlus,
  RefreshCw,
} from "lucide-react";

export default function SheetsSyncPage() {
  const [spreadsheetId, setSpreadsheetId] = useState("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    title?: string;
    sheets?: string[];
    error?: string;
  } | null>(null);

  const [targetsFound, setTargetsFound] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const defaultMappings = [
    { col: "A", header: "Domain / Target", path: "domain", dir: "READ_WRITE" },
    { col: "B", header: "Company Name", path: "companyName", dir: "WRITE" },
    { col: "C", header: "Phone Number", path: "phones.0.number", dir: "WRITE" },
    { col: "D", header: "Verified Email", path: "emails.0.address", dir: "WRITE" },
    { col: "E", header: "LinkedIn URL", path: "socialProfiles.linkedin", dir: "WRITE" },
    { col: "F", header: "Maps Rating", path: "googleMaps.rating", dir: "WRITE" },
    { col: "G", header: "Status", path: "verificationStatus", dir: "WRITE" },
  ];

  async function handleTestConnection() {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          spreadsheetId: spreadsheetId.trim(),
        }),
      });
      const data = await res.json();
      setConnectionStatus({
        connected: data.success,
        title: data.title,
        sheets: data.sheets,
        error: data.error,
      });
    } catch (err: any) {
      setConnectionStatus({
        connected: false,
        error: err.message,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleReadTargets() {
    setTesting(true);
    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read_targets",
          spreadsheetId: spreadsheetId.trim(),
          sheetName,
        }),
      });
      const data = await res.json();
      setTargetsFound(data.targets || []);
    } catch (err: any) {
      alert(`Read error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleStartLiveSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_sheet_scrape",
          spreadsheetId: spreadsheetId.trim(),
          sheetName,
        }),
      });
      const data = await res.json();
      setActiveJobId(data.jobId);
      alert(`Continuous sync job started! Task ID: ${data.jobId}. Background workers are reading targets and streaming enriched rows directly back to your Google Sheet.`);
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sheet className="w-5 h-5 text-emerald-600" /> Google Sheets Live Two-Way Sync
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your Google Sheet live: Read raw domains or company names from input columns, execute background enrichment, and stream verified attributes back in real-time.
        </p>
      </div>

      {/* Spreadsheet Connection Form */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Spreadsheet Credentials & Target Tab
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Google Spreadsheet ID or Full URL
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Worksheet Tab Name
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full text-xs p-2.5 bg-muted/40 border border-border rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            {testing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Test Live Connection
              </>
            )}
          </button>

          <button
            onClick={handleReadTargets}
            className="px-4 py-2 bg-card hover:bg-muted text-foreground border border-border font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-all"
          >
            <ListPlus className="w-3.5 h-3.5" /> Read Input Rows from Sheet
          </button>
        </div>

        {/* Connection Status Box */}
        {connectionStatus && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              connectionStatus.connected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            {connectionStatus.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold block">
                {connectionStatus.connected ? "Connection Verified!" : "Connection Failed"}
              </span>
              <p className="mt-0.5">
                {connectionStatus.connected
                  ? `Spreadsheet: "${connectionStatus.title || "Target Sheet"}". Available tabs: ${connectionStatus.sheets?.join(", ")}`
                  : connectionStatus.error}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Targets Discovered from Sheet */}
      {targetsFound.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">
              Detected Targets in Sheet Column A ({targetsFound.length} Rows)
            </h3>
            <span className="text-[11px] text-muted-foreground">Ready to enrich</span>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg font-mono text-xs max-h-36 overflow-y-auto space-y-1">
            {targetsFound.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-muted-foreground w-6">#{idx + 1}</span>
                <span className="font-semibold text-foreground">{t}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartLiveSync}
            disabled={syncing}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {syncing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Starting Background Workers...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Continuous Scrape & Stream Results Back to Sheet
              </>
            )}
          </button>
        </div>
      )}

      {/* Predefined Column Mapping Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Predefined Column Mapping Specification
            </h3>
            <p className="text-xs text-muted-foreground">
              Define what each column in the Google Sheet corresponds to in the scraper pipeline.
            </p>
          </div>
          <span className="text-xs bg-muted px-2.5 py-1 rounded text-muted-foreground font-mono">
            Mode: Bi-Directional
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3 py-2.5 rounded-l-md">Column</th>
                <th className="px-3 py-2.5">Sheet Header</th>
                <th className="px-3 py-2.5">Scraper Attribute Path</th>
                <th className="px-3 py-2.5 rounded-r-md">Data Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {defaultMappings.map((m) => (
                <tr key={m.col} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-600">{m.col}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{m.header}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{m.path}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.dir === "READ_WRITE"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {m.dir}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

