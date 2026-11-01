"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Database,
  Search,
  Filter,
  Download,
  Upload,
  Star,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  RotateCw,
  Users,
  Building2,
  MapPin,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Tag,
  Clock,
  X,
  Copy,
  Check,
  ChevronRight,
  ListFilter,
  Layers,
  Share2,
  Trash2,
  Plus,
} from "lucide-react";
import { Company } from "@/core/models/Company";
import { Person } from "@/core/models/Person";

export default function DataExplorerPage() {
  const [activeTab, setActiveTab] = useState<"ORGANIZATIONS" | "PEOPLE" | "LISTS">("ORGANIZATIONS");

  // Companies state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);

  // People state
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Lists state
  const [savedLists, setSavedLists] = useState<string[]>([
    "All Harvested Leads",
    "High Intent Exporters",
    "WhatsApp Ready Contacts",
    "Pune & Mumbai Engineering",
  ]);
  const [selectedList, setSelectedList] = useState<string>("ALL");
  const [newListName, setNewListName] = useState("");
  const [showNewListModal, setShowNewListModal] = useState(false);

  // Row Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Enriching state
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [enrichmentFilter, setEnrichmentFilter] = useState("ALL");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(false);
  const [hasLinkedin, setHasLinkedin] = useState(false);

  // Inspect Slide-Over Drawer state
  const [drawerRecord, setDrawerRecord] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"OVERVIEW" | "SOCIALS" | "WATERFALL" | "NOTES">("OVERVIEW");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bulk Import Modal state
  const [importModalOpen, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"ORGANIZATIONS" | "PEOPLE">("ORGANIZATIONS");
  const [csvRawText, setCsvRawText] = useState("");
  const [importing, setImporting] = useState(false);

  // Fetch Companies from MongoDB Atlas
  async function fetchCompanies() {
    setCompanyLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (minRating) params.set("minRating", minRating.toString());

      const res = await fetch(`/api/companies?${params.toString()}`);
      const data = await res.json();
      setCompanies(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCompanyLoading(false);
    }
  }

  // Fetch People from MongoDB Atlas
  async function fetchPeople() {
    setPeopleLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (seniorityFilter !== "ALL") params.set("seniority", seniorityFilter);
      if (departmentFilter !== "ALL") params.set("department", departmentFilter);
      if (hasEmail) params.set("hasEmail", "true");
      if (hasPhone) params.set("hasPhone", "true");
      if (hasWhatsapp) params.set("hasWhatsapp", "true");
      if (hasLinkedin) params.set("hasLinkedin", "true");

      const res = await fetch(`/api/people?${params.toString()}`);
      const data = await res.json();
      setPeople(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setPeopleLoading(false);
    }
  }

  useEffect(() => {
    fetchCompanies();
    fetchPeople();
  }, []);

  useEffect(() => {
    if (activeTab === "ORGANIZATIONS") {
      fetchCompanies();
    } else if (activeTab === "PEOPLE") {
      fetchPeople();
    }
  }, [activeTab, statusFilter, seniorityFilter, departmentFilter, minRating, hasEmail, hasPhone, hasWhatsapp, hasLinkedin]);

  // Keyboard Escape listener to close drawer or modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerRecord(null);
        setShowImportModal(false);
        setShowNewListModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Copy to clipboard helper with feedback
  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Row selection helpers
  const currentItems = activeTab === "ORGANIZATIONS" ? companies : people;
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const isAllSelected = currentItems.length > 0 && currentItems.every((item) => selectedIds[item.id || (item as any)._id]);

  function toggleSelectAll() {
    const next: Record<string, boolean> = {};
    if (!isAllSelected) {
      currentItems.forEach((item) => {
        next[item.id || (item as any)._id] = true;
      });
    }
    setSelectedIds(next);
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // Single record cascade enrich trigger
  async function handleEnrichCompany(companyId: string) {
    setEnrichingId(companyId);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCompanies();
        await fetchPeople();
        if (drawerRecord?.id === companyId) {
          const updated = companies.find((c) => c.id === companyId);
          if (updated) setDrawerRecord(updated);
        }
      }
    } catch (e) {
      console.error("Enrich error:", e);
    } finally {
      setEnrichingId(null);
    }
  }

  // Enrich all pending records in background
  async function handleEnrichAllPending() {
    setEnrichingAll(true);
    try {
      await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runPending: true }),
      });
      alert("Autonomous cascade enrichment fleet triggered in background! Auditing Google Maps & official websites...");
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        fetchCompanies();
        fetchPeople();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnrichingAll(false);
    }
  }

  // Handle CSV Bulk Import
  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvRawText.trim()) return;

    setImporting(true);
    try {
      // Parse CSV text into records
      const lines = csvRawText.trim().split("\n");
      if (lines.length < 2) {
        alert("CSV must have at least 1 header line and 1 data line.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || "";
        });
        records.push(obj);
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: importType,
          records,
          listName: selectedList !== "ALL" ? selectedList : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import CSV");

      alert(data.message || `Successfully imported ${records.length} records!`);
      setShowImportModal(false);
      setCsvRawText("");
      fetchCompanies();
      fetchPeople();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  // Export CSV Helper
  function exportCSV(exportSelectedOnly = false) {
    if (activeTab === "PEOPLE") {
      let list = people;
      if (exportSelectedOnly) {
        list = people.filter((p) => selectedIds[p.id || (p as any)._id]);
      }
      if (list.length === 0) {
        alert("No records to export.");
        return;
      }

      const headers = [
        "Full Name",
        "Designation",
        "Seniority",
        "Department",
        "Organization",
        "Domain",
        "Work Email",
        "Email Verified",
        "Mobile Phone",
        "WhatsApp Ready",
        "LinkedIn URL",
        "City",
        "Address",
        "Enrichment Status",
      ];
      const rows = list.map((p) => [
        `"${p.fullName || ""}"`,
        `"${p.designation || ""}"`,
        `"${p.seniority || ""}"`,
        `"${p.department || ""}"`,
        `"${p.organizationName || ""}"`,
        `"${p.organizationDomain || ""}"`,
        `"${p.workEmail || ""}"`,
        `"${p.workEmailVerified ? "YES" : "NO"}"`,
        `"${p.mobilePhone || p.phone || ""}"`,
        `"${p.whatsappAvailable ? "YES" : "NO"}"`,
        `"${p.linkedinUrl || ""}"`,
        `"${p.location?.city || ""}"`,
        `"${p.location?.raw || ""}"`,
        `"${p.enrichmentStatus || "ENRICHED"}"`,
      ]);

      downloadCsvFile(headers, rows, `decision_makers_leads_${Date.now()}.csv`);
    } else {
      let list = companies;
      if (exportSelectedOnly) {
        list = companies.filter((c) => selectedIds[c.id || (c as any)._id]);
      }
      if (list.length === 0) {
        alert("No records to export.");
        return;
      }

      const headers = [
        "Company Name",
        "Domain",
        "Website",
        "Contact Person",
        "Designation",
        "Primary Phone",
        "Alternate Phones",
        "Corporate Email",
        "Factory Address",
        "City",
        "Products Catalog",
        "Google Maps Rating",
        "LinkedIn",
        "Twitter",
        "Enrichment Status",
        "Sources",
      ];
      const rows = list.map((c) => [
        `"${c.companyName || ""}"`,
        `"${c.domain || ""}"`,
        `"${c.websiteUrl || ""}"`,
        `"${c.contactPerson || ""}"`,
        `"${c.designation || ""}"`,
        `"${c.phones[0]?.number || ""}"`,
        `"${c.phones.slice(1).map((p) => p.number).join(", ") || ""}"`,
        `"${c.emails[0]?.address || ""}"`,
        `"${c.addresses[0]?.fullAddress || ""}"`,
        `"${c.addresses[0]?.city || ""}"`,
        `"${(c.products || "").replace(/"/g, '""')}"`,
        `"${c.googleMaps?.rating || ""}"`,
        `"${c.socialProfiles?.linkedin || ""}"`,
        `"${c.socialProfiles?.twitter || ""}"`,
        `"${c.enrichmentStatus || "PENDING"}"`,
        `"${(c.enrichmentSources || []).join("; ")}"`,
      ]);

      downloadCsvFile(headers, rows, `verified_companies_master_${Date.now()}.csv`);
    }
  }

  function downloadCsvFile(headers: string[], rows: string[][], filename: string) {
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setEnrichmentFilter("ALL");
    setSeniorityFilter("ALL");
    setDepartmentFilter("ALL");
    setMinRating(undefined);
    setHasEmail(false);
    setHasPhone(false);
    setHasWhatsapp(false);
    setHasLinkedin(false);
    setSelectedList("ALL");
  }

  const activeFiltersCount =
    (search ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (enrichmentFilter !== "ALL" ? 1 : 0) +
    (seniorityFilter !== "ALL" ? 1 : 0) +
    (departmentFilter !== "ALL" ? 1 : 0) +
    (minRating ? 1 : 0) +
    (hasEmail ? 1 : 0) +
    (hasPhone ? 1 : 0) +
    (hasWhatsapp ? 1 : 0) +
    (hasLinkedin ? 1 : 0) +
    (selectedList !== "ALL" ? 1 : 0);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Master Intelligence Data Grid
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clay-grade spreadsheet explorer, granular filters, slide-over inspect drawer, and real-time MongoDB Atlas persistence.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Import */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Bulk Import CSV
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportCSV(false)}
            className="px-3.5 py-2 bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-foreground" /> Export Master CSV
          </button>

          {/* Auto-Enrich All Pending */}
          <button
            onClick={handleEnrichAllPending}
            disabled={enrichingAll}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            {enrichingAll ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Auto-Enrich All Pending
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation (Organizations, Decision Makers, Lists) */}
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("ORGANIZATIONS");
              setSelectedIds({});
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "ORGANIZATIONS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Building2 className="w-4 h-4" /> Organizations ({companies.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("PEOPLE");
              setSelectedIds({});
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "PEOPLE"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Users className="w-4 h-4" /> Decision Makers & People ({people.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("LISTS");
              setSelectedIds({});
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "LISTS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <ListFilter className="w-4 h-4" /> Saved Lists & Segments ({savedLists.length})
          </button>
        </div>

        {/* Quick Filter Active Badge */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200">
              {activeFiltersCount} filters active
            </span>
            <button onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground text-[11px] font-medium underline">
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* CLAY-STYLE ADVANCED FILTER & SEARCH BAR */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-3">
        {/* Row 1: Search & Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {/* Keyword Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, person name, title, city, phone..."
              className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Verification Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Verified Records Only</option>
              <option value="UNVERIFIED">Unverified Only</option>
            </select>
          </div>

          {/* Enrichment Status */}
          <div>
            <select
              value={enrichmentFilter}
              onChange={(e) => setEnrichmentFilter(e.target.value)}
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Enrichment States</option>
              <option value="ENRICHED">Enriched Leads</option>
              <option value="PENDING">Pending Auto-Search</option>
            </select>
          </div>

          {/* Google Maps Rating */}
          <div>
            <select
              value={minRating || ""}
              onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any Google Maps Rating</option>
              <option value="4.5">Rating 4.5+ ⭐</option>
              <option value="4.0">Rating 4.0+ ⭐</option>
              <option value="3.5">Rating 3.5+ ⭐</option>
            </select>
          </div>

          {/* Filter by List */}
          <div>
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="w-full p-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Lists</option>
              {savedLists.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Instant Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Instant Filters:</span>

          <label
            className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium text-[11px] flex items-center gap-1.5 transition-all ${
              hasPhone
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <input type="checkbox" checked={hasPhone} onChange={(e) => setHasPhone(e.target.checked)} className="sr-only" />
            <Phone className="w-3 h-3 text-emerald-600" /> Has Unmasked Phone
          </label>

          <label
            className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium text-[11px] flex items-center gap-1.5 transition-all ${
              hasEmail
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} className="sr-only" />
            <Mail className="w-3 h-3 text-blue-600" /> Has Corporate Email
          </label>

          <label
            className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium text-[11px] flex items-center gap-1.5 transition-all ${
              hasWhatsapp
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <input type="checkbox" checked={hasWhatsapp} onChange={(e) => setHasWhatsapp(e.target.checked)} className="sr-only" />
            <span className="text-emerald-600 font-bold text-[10px]">WA</span> WhatsApp Ready
          </label>

          <label
            className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium text-[11px] flex items-center gap-1.5 transition-all ${
              hasLinkedin
                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <input type="checkbox" checked={hasLinkedin} onChange={(e) => setHasLinkedin(e.target.checked)} className="sr-only" />
            <Linkedin className="w-3 h-3 text-sky-600" /> Has LinkedIn Profile
          </label>

          {activeTab === "PEOPLE" && (
            <>
              <select
                value={seniorityFilter}
                onChange={(e) => setSeniorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-foreground text-[11px] font-medium"
              >
                <option value="ALL">All Seniority Depths</option>
                <option value="FOUNDER">Founder / Co-Founder</option>
                <option value="C_SUITE">C-Suite Executive</option>
                <option value="DIRECTOR">Director / Partner</option>
                <option value="VP">Vice President</option>
                <option value="MANAGER">Manager / Lead</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-foreground text-[11px] font-medium"
              >
                <option value="ALL">All Departments</option>
                <option value="EXECUTIVE">Executive Management</option>
                <option value="ENGINEERING">Engineering & Technical</option>
                <option value="SALES">Sales & Business Dev</option>
                <option value="MARKETING">Marketing & Growth</option>
                <option value="OPERATIONS">Operations & Plant</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* BULK ACTION FLOATING BAR (When rows are selected) */}
      {selectedCount > 0 && (
        <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in duration-200 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {selectedCount} selected
            </span>
            <span>Bulk actions for selected {activeTab.toLowerCase()}:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(true)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Export Selected ({selectedCount})
            </button>
            <button
              onClick={() => alert(`Added ${selectedCount} records to list "${selectedList !== "ALL" ? selectedList : "High Intent Exporters"}"`)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1.5"
            >
              <Tag className="w-3 h-3" /> Add to List
            </button>
            <button
              onClick={() => setSelectedIds({})}
              className="px-2.5 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-white/80"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* SAVED LISTS SUB-TAB VIEW */}
      {activeTab === "LISTS" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-blue-600" /> Custom Saved Lead Lists & Segments
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organize verified organizations and decision makers into dedicated campaign lists.
              </p>
            </div>
            <button
              onClick={() => setShowNewListModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create New List
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {savedLists.map((listName, idx) => (
              <div
                key={listName}
                onClick={() => {
                  setSelectedList(listName);
                  setActiveTab("ORGANIZATIONS");
                }}
                className="p-4 bg-muted/30 hover:bg-muted/60 border border-border rounded-xl cursor-pointer transition-all hover:border-blue-500 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                      Segment #{idx + 1}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors mt-1">
                    {listName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Verified B2B leads segmented for outbound outreach.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                  <span>Filter Central Grid</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLAY-STYLE WIDE SPREADSHEET GRID WITH HORIZONTAL SCROLL */}
      {activeTab !== "LISTS" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-xs text-left border-collapse min-w-[1450px]">
              {/* STICKY SPREADSHEET HEADER */}
              <thead className="bg-muted/80 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border sticky top-0 z-20 backdrop-blur-sm">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="px-3 py-3 w-10 text-center sticky left-0 bg-muted/95 z-30 border-r border-border/60">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>

                  {activeTab === "ORGANIZATIONS" ? (
                    <>
                      <th className="px-4 py-3 sticky left-10 bg-muted/95 z-30 min-w-[240px] border-r border-border/60">
                        <span className="flex items-center gap-1.5 text-foreground font-bold">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" /> Company & Domain
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[200px]">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" /> Decision Maker & Role
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[180px]">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Unmasked Phone
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[190px]">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-600" /> Corporate Email
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[220px]">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500" /> Factory Address & City
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[120px]">
                        <span className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Google Maps
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[130px]">
                        <span className="flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-sky-500" /> Digital Footprint
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[120px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Status
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[130px] text-right sticky right-0 bg-muted/95 z-30 border-l border-border/60">
                        Actions
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 sticky left-10 bg-muted/95 z-30 min-w-[240px] border-r border-border/60">
                        <span className="flex items-center gap-1.5 text-foreground font-bold">
                          <Users className="w-3.5 h-3.5 text-blue-600" /> Decision Maker Name
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[180px]">
                        <span className="flex items-center gap-1.5">Designation & Seniority</span>
                      </th>
                      <th className="px-4 py-3 min-w-[200px]">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Organization
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[180px]">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Mobile / Direct Phone
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[190px]">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-600" /> Verified Work Email
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[140px]">
                        <span className="flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-sky-500" /> Social Profiles
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[180px]">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500" /> Location
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[120px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verification
                        </span>
                      </th>
                      <th className="px-4 py-3 min-w-[130px] text-right sticky right-0 bg-muted/95 z-30 border-l border-border/60">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              {/* SPREADSHEET BODY */}
              <tbody className="divide-y divide-border text-[11px]">
                {/* ORGANIZATIONS ROWS */}
                {activeTab === "ORGANIZATIONS" &&
                  (companies.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-muted-foreground">
                        {companyLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RotateCw className="w-6 h-6 text-blue-600 animate-spin" />
                            <span>Loading organizations from MongoDB Atlas...</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Building2 className="w-8 h-8 mx-auto text-muted-foreground/40" />
                            <p className="font-semibold text-foreground text-xs">No organizations matching filters</p>
                            <p className="text-[11px] text-muted-foreground">Try clearing filters or importing a CSV file.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    companies.map((c) => {
                      const id = c.id || (c as any)._id;
                      const isSelected = selectedIds[id] || false;
                      const primaryPhone = c.phones[0]?.number || "";
                      const primaryEmail = c.emails[0]?.address || "";
                      const fullAddr = c.addresses[0]?.fullAddress || "";
                      const city = c.addresses[0]?.city || "";

                      return (
                        <tr
                          key={id}
                          className={`hover:bg-muted/40 transition-colors group ${
                            isSelected ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="px-3 py-3 text-center sticky left-0 bg-card group-hover:bg-muted/40 z-10 border-r border-border/60">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(id)}
                              className="rounded text-blue-600 cursor-pointer"
                            />
                          </td>

                          {/* Company Name & Domain (Sticky Column) */}
                          <td className="px-4 py-3 sticky left-10 bg-card group-hover:bg-muted/40 z-10 border-r border-border/60">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                {c.companyName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span
                                  onClick={() => {
                                    setDrawerRecord(c);
                                    setDrawerTab("OVERVIEW");
                                  }}
                                  className="font-bold text-foreground text-xs block truncate hover:text-blue-600 cursor-pointer"
                                  title={c.companyName}
                                >
                                  {c.companyName}
                                </span>
                                {c.websiteUrl ? (
                                  <a
                                    href={c.websiteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-muted-foreground hover:text-blue-600 truncate flex items-center gap-1 font-mono"
                                  >
                                    {c.domain} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono">{c.domain}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Decision Maker & Role */}
                          <td className="px-4 py-3">
                            {c.contactPerson ? (
                              <div>
                                <span className="font-semibold text-foreground block truncate" title={c.contactPerson}>
                                  {c.contactPerson}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                  {c.designation || "Executive"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic text-[10px]">Unassigned</span>
                            )}
                          </td>

                          {/* Unmasked Phone with Copy */}
                          <td className="px-4 py-3 font-mono">
                            {primaryPhone ? (
                              <div
                                onClick={() => copyToClipboard(primaryPhone, `phone_${id}`)}
                                className="flex items-center gap-1.5 cursor-pointer group/copy hover:text-emerald-700"
                                title="Click to copy phone"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-foreground">{primaryPhone}</span>
                                {copiedKey === `phone_${id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600/80 text-[10px] flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Pending cross-search
                              </span>
                            )}
                          </td>

                          {/* Corporate Email with Copy */}
                          <td className="px-4 py-3 font-mono">
                            {primaryEmail ? (
                              <div
                                onClick={() => copyToClipboard(primaryEmail, `email_${id}`)}
                                className="flex items-center gap-1.5 cursor-pointer group/copy"
                                title="Click to copy email"
                              >
                                <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="text-blue-600 truncate max-w-[160px]">{primaryEmail}</span>
                                {copiedKey === `email_${id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">-</span>
                            )}
                          </td>

                          {/* Factory Address & City */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <span className="text-foreground truncate block" title={fullAddr || city}>
                              {fullAddr || city || "Maharashtra, India"}
                            </span>
                            {city && <span className="text-[10px] text-muted-foreground block font-medium">{city}</span>}
                          </td>

                          {/* Google Maps Rating */}
                          <td className="px-4 py-3">
                            {c.googleMaps?.rating ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {c.googleMaps.rating}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">-</span>
                            )}
                          </td>

                          {/* Digital Footprint & Socials */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {c.socialProfiles?.linkedin && (
                                <a href={c.socialProfiles.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {c.socialProfiles?.twitter && (
                                <a href={c.socialProfiles.twitter} target="_blank" rel="noreferrer" className="text-sky-500 hover:text-sky-600">
                                  <Twitter className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {c.socialProfiles?.facebook && (
                                <a href={c.socialProfiles.facebook} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700">
                                  <Facebook className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {c.socialProfiles?.instagram && (
                                <a href={c.socialProfiles.instagram} target="_blank" rel="noreferrer" className="text-pink-600 hover:text-pink-700">
                                  <Instagram className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {!c.socialProfiles?.linkedin && !c.socialProfiles?.twitter && !c.socialProfiles?.facebook && (
                                <span className="text-muted-foreground/60 text-[10px]">-</span>
                              )}
                            </div>
                          </td>

                          {/* Enrichment Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 ${
                                c.enrichmentStatus === "ENRICHED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {c.enrichmentStatus || "VERIFIED"}
                            </span>
                          </td>

                          {/* Actions (View Profile Drawer) */}
                          <td className="px-4 py-3 text-right sticky right-0 bg-card group-hover:bg-muted/40 z-10 border-l border-border/60">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEnrichCompany(id)}
                                disabled={enrichingId === id}
                                className="px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 rounded border border-emerald-300 transition-all flex items-center gap-1"
                                title="Run Cascade Enrichment"
                              >
                                {enrichingId === id ? (
                                  <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Zap className="w-2.5 h-2.5" />
                                )}
                                Enrich
                              </button>
                              <button
                                onClick={() => {
                                  setDrawerRecord(c);
                                  setDrawerTab("OVERVIEW");
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded border border-blue-200 transition-all"
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ))}

                {/* PEOPLE / DECISION MAKERS ROWS */}
                {activeTab === "PEOPLE" &&
                  (people.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-muted-foreground">
                        {peopleLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RotateCw className="w-6 h-6 text-blue-600 animate-spin" />
                            <span>Loading verified decision makers...</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                            <p className="font-semibold text-foreground text-xs">No decision makers matching filters</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    people.map((p) => {
                      const id = p.id || (p as any)._id;
                      const isSelected = selectedIds[id] || false;
                      const phone = p.mobilePhone || p.phone || "";
                      const email = p.workEmail || "";

                      return (
                        <tr
                          key={id}
                          className={`hover:bg-muted/40 transition-colors group ${
                            isSelected ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="px-3 py-3 text-center sticky left-0 bg-card group-hover:bg-muted/40 z-10 border-r border-border/60">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(id)}
                              className="rounded text-blue-600 cursor-pointer"
                            />
                          </td>

                          {/* Person Name (Sticky Column) */}
                          <td className="px-4 py-3 sticky left-10 bg-card group-hover:bg-muted/40 z-10 border-r border-border/60">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                {p.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span
                                  onClick={() => {
                                    setDrawerRecord(p);
                                    setDrawerTab("OVERVIEW");
                                  }}
                                  className="font-bold text-foreground text-xs block truncate hover:text-blue-600 cursor-pointer"
                                >
                                  {p.fullName}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {p.organizationName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Designation & Seniority */}
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground block truncate">{p.designation}</span>
                            <span className="text-[9px] bg-blue-500/10 text-blue-700 px-1.5 py-0.2 rounded font-mono font-semibold">
                              {p.seniority}
                            </span>
                          </td>

                          {/* Organization */}
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground block truncate">{p.organizationName}</span>
                            {p.organizationDomain && (
                              <span className="text-[10px] text-muted-foreground font-mono">{p.organizationDomain}</span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3 font-mono">
                            {phone ? (
                              <div
                                onClick={() => copyToClipboard(phone, `p_phone_${id}`)}
                                className="flex items-center gap-1.5 cursor-pointer group/copy"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-foreground">{phone}</span>
                                {p.whatsappAvailable && (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1 rounded font-bold">
                                    WA
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">-</span>
                            )}
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3 font-mono">
                            {email ? (
                              <div
                                onClick={() => copyToClipboard(email, `p_mail_${id}`)}
                                className="flex items-center gap-1.5 cursor-pointer group/copy"
                              >
                                <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="text-blue-600 truncate max-w-[160px]">{email}</span>
                                {p.workEmailVerified && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                                    MX
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">-</span>
                            )}
                          </td>

                          {/* Social Profiles */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p.linkedinUrl && (
                                <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {p.twitterUrl && (
                                <a href={p.twitterUrl} target="_blank" rel="noreferrer" className="text-sky-500 hover:text-sky-600">
                                  <Twitter className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {!p.linkedinUrl && !p.twitterUrl && <span className="text-muted-foreground/60 text-[10px]">-</span>}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground truncate block">
                              {p.location?.city || p.location?.raw || "India"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {p.enrichmentStatus || "VERIFIED"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right sticky right-0 bg-card group-hover:bg-muted/40 z-10 border-l border-border/60">
                            <button
                              onClick={() => {
                                setDrawerRecord(p);
                                setDrawerTab("OVERVIEW");
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded border border-blue-200 transition-all"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SLIDE-OVER INSPECT DRAWER (RIGHT PANEL)                  */}
      {/* ======================================================== */}
      {drawerRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dark Backdrop with Click-to-Close */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerRecord(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
              {/* Drawer Top Header */}
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {(drawerRecord.companyName || drawerRecord.fullName || "L").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-foreground truncate">
                      {drawerRecord.companyName || drawerRecord.fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {drawerRecord.domain || drawerRecord.organizationDomain || drawerRecord.websiteUrl || "Verified Record"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDrawerRecord(null)}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    ✕ Close Drawer <span className="text-[10px] text-muted-foreground font-mono font-normal">(Esc)</span>
                  </button>
                </div>
              </div>

              {/* Drawer Tabs Bar */}
              <div className="flex items-center border-b border-border px-5 text-xs font-semibold gap-4 bg-muted/20 shrink-0">
                {[
                  { id: "OVERVIEW", label: "Contact Intel" },
                  { id: "SOCIALS", label: "Digital Footprint" },
                  { id: "WATERFALL", label: "Enrichment Logs" },
                  { id: "NOTES", label: "Notes & Lists" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id as any)}
                    className={`py-3 border-b-2 transition-all ${
                      drawerTab === t.id
                        ? "border-blue-600 text-blue-600 font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* TAB 1: OVERVIEW & CONTACT INTEL */}
                {drawerTab === "OVERVIEW" && (
                  <div className="space-y-4">
                    {/* Primary Contact Person if Company */}
                    {drawerRecord.contactPerson && (
                      <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Key Decision Maker:
                        </span>
                        <span className="text-sm font-bold text-foreground block">
                          {drawerRecord.contactPerson}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {drawerRecord.designation || "Executive"}
                        </span>
                      </div>
                    )}

                    {/* Phones */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Unmasked Direct Phone Number(s):
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-emerald-600">
                          {drawerRecord.phones?.[0]?.number || drawerRecord.mobilePhone || drawerRecord.phone || "Pending cross-search"}
                        </span>
                        {(drawerRecord.phones?.[0]?.number || drawerRecord.mobilePhone) && (
                          <button
                            onClick={() => copyToClipboard(drawerRecord.phones?.[0]?.number || drawerRecord.mobilePhone, "drawer_phone")}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        )}
                      </div>
                      {drawerRecord.phones && drawerRecord.phones.length > 1 && (
                        <div className="text-[11px] text-muted-foreground font-mono space-y-0.5 pt-1 border-t border-border/50">
                          <span className="block font-medium">Alternate Numbers:</span>
                          {drawerRecord.phones.slice(1).map((p: any, i: number) => (
                            <p key={i}>• {p.number} ({p.source})</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Emails */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Verified Corporate Email:
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-blue-600">
                          {drawerRecord.emails?.[0]?.address || drawerRecord.workEmail || "Not detected"}
                        </span>
                        {(drawerRecord.emails?.[0]?.address || drawerRecord.workEmail) && (
                          <button
                            onClick={() => copyToClipboard(drawerRecord.emails?.[0]?.address || drawerRecord.workEmail, "drawer_email")}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Physical Address */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Factory / Corporate Address:
                      </span>
                      <p className="text-foreground text-xs leading-relaxed">
                        {drawerRecord.addresses?.[0]?.fullAddress || drawerRecord.location?.raw || "Maharashtra, India"}
                      </p>
                    </div>

                    {/* Products & Description */}
                    {drawerRecord.products && (
                      <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Catalog & Products:
                        </span>
                        <p className="text-foreground text-xs leading-relaxed">{drawerRecord.products}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DIGITAL FOOTPRINT & SOCIALS */}
                {drawerTab === "SOCIALS" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Discovered social media channels and digital footprints across online directories:
                    </p>

                    <div className="space-y-2">
                      {[
                        { name: "LinkedIn Profile", icon: Linkedin, val: drawerRecord.socialProfiles?.linkedin || drawerRecord.linkedinUrl },
                        { name: "Twitter / X Handle", icon: Twitter, val: drawerRecord.socialProfiles?.twitter || drawerRecord.twitterUrl },
                        { name: "Facebook Business Page", icon: Facebook, val: drawerRecord.socialProfiles?.facebook },
                        { name: "Instagram Profile", icon: Instagram, val: drawerRecord.socialProfiles?.instagram },
                      ].map((item) => (
                        <div key={item.name} className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-2">
                            <item.icon className="w-4 h-4 text-blue-600" /> {item.name}
                          </span>
                          {item.val ? (
                            <a
                              href={item.val}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              Visit Channel <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Not linked</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                      <span className="font-bold text-blue-700 dark:text-blue-300 block text-xs">
                        Missing Social Profiles?
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Use the dedicated Social Media Scraper to run a live multi-channel audit for this entity.
                      </p>
                      <Link
                        href="/social-scraper"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Launch Social Media Scraper <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* TAB 3: ENRICHMENT WATERFALL LOGS */}
                {drawerTab === "WATERFALL" && (
                  <div className="space-y-3">
                    <span className="font-bold text-foreground block text-xs">
                      Consulted Verification & Unmasking Sources:
                    </span>
                    {(drawerRecord.enrichmentSources || ["Directory Seed Extraction", "Schema.org DOM Unmasker"]).map((src: string, i: number) => (
                      <div key={i} className="p-2.5 bg-muted/30 border border-border rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-foreground text-xs">{src}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 4: NOTES & CUSTOM LISTS */}
                {drawerTab === "NOTES" && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-bold text-foreground block mb-1">Assigned List / Segment</label>
                      <select
                        defaultValue={savedLists[0]}
                        className="w-full p-2 bg-muted/40 border border-border rounded-xl font-medium"
                      >
                        {savedLists.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-foreground block mb-1">Internal Notes</label>
                      <textarea
                        rows={4}
                        placeholder="Add custom notes about this verified lead..."
                        className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-blue-500"
                        defaultValue={drawerRecord.notes || ""}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Action Bar */}
              <div className="p-5 border-t border-border flex items-center justify-between shrink-0 bg-card">
                <button
                  onClick={() => handleEnrichCompany(drawerRecord.id || (drawerRecord as any)._id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" /> Re-Enrich Now
                </button>

                <button
                  onClick={() => setDrawerRecord(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK CSV IMPORT MODAL                                    */}
      {/* ======================================================== */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowImportModal(false);
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Bulk CSV Lead Ingestion</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Ingestion Target Entity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportType("ORGANIZATIONS")}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                      importType === "ORGANIZATIONS"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-muted/40 text-muted-foreground border-border"
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Organizations / Companies
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType("PEOPLE")}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                      importType === "PEOPLE"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-muted/40 text-muted-foreground border-border"
                    }`}
                  >
                    <Users className="w-4 h-4" /> Decision Makers / People
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Paste CSV Records or Drag & Drop (Headers on row 1)
                </label>
                <textarea
                  rows={6}
                  required
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder={`Company Name,Domain,Contact Person,Phone,Email,City\nAcme Tools,acmetools.in,Mr. Sharma,+91 9820011223,sharma@acmetools.in,Pune\nPrecision Press,precisionpress.com,Ms. Anita Rao,+91 9845012345,anita@precisionpress.com,Mumbai`}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Accepts standard comma-delimited columns. Imported records will be queued for cascade auto-enrichment.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:text-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !csvRawText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  {importing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Ingest & Auto-Enrich Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW LIST MODAL */}
      {showNewListModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewListModal(false);
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Create New Lead Segment</h3>
              <button onClick={() => setShowNewListModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">List Name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Gujarat Chemical Suppliers"
                  className="w-full p-2 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="px-3 py-1.5 border border-border rounded-lg text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newListName.trim()) {
                      setSavedLists((prev) => [...prev, newListName.trim()]);
                      setNewListName("");
                      setShowNewListModal(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg"
                >
                  Create List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
