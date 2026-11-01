"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Users,
  Building2,
  Share2,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  MapPin,
  Star,
  Download,
  Play,
  CheckCircle2,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  X,
  Layers,
  ShieldCheck,
  Info,
} from "lucide-react";
import { SeniorityLevel, Department } from "@/core/models/Person";
import { OmniCampaign } from "@/services/scrapers/OmniPipelineManager";
import { OmniOrgDossier } from "@/services/scrapers/OmniChannelScraperEngine";

export default function OmniScraperPage() {
  const [campaigns, setCampaigns] = useState<OmniCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<OmniCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  // New Campaign Modal / Form
  const [modalOpen, setModalOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"MANUAL" | "FILE">("MANUAL");
  const [orgsInput, setOrgsInput] = useState(
    "Mahratta Chamber of Commerce, Industries and Agriculture (MCCIA)\nTata Motors\nPraj Industries"
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedFileOrgs, setParsedFileOrgs] = useState<string[]>([]);

  // Granular Field & Scope Selection
  const [extractPeople, setExtractPeople] = useState(true);
  const [maxPeoplePerOrg, setMaxPeoplePerOrg] = useState(100);
  const [depth, setDepth] = useState<"QUICK" | "DEEP_360" | "COMPREHENSIVE_ABM">("COMPREHENSIVE_ABM");

  const [seniorities, setSeniorities] = useState<Record<SeniorityLevel, boolean>>({
    CHAIRMAN: true,
    DIRECTOR: true,
    BOARD_MEMBER: true,
    C_SUITE: true,
    VP: true,
    HEAD_OF_DEPT: true,
    MANAGER: true,
    GENERAL: true,
    FOUNDER: true,
    ADVISOR: true,
    MARKETING: true,
    SALES: true,
    CUSTOMER_SUPPORT: true,
  });

  const [extractEmails, setExtractEmails] = useState(true);
  const [extractPhones, setExtractPhones] = useState(true);
  const [extractSocial, setExtractSocial] = useState(true);
  const [extractOrgDetails, setExtractOrgDetails] = useState(true);
  const [extractGoogleMaps, setExtractGoogleMaps] = useState(true);

  // Launching state
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dossier view state
  const [activeDossierIndex, setActiveDossierIndex] = useState(0);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"PEOPLE" | "ORG" | "SOCIAL">("PEOPLE");

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/omni-scraper");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      if (selectedCampaign) {
        const updated = data.campaigns?.find((c: OmniCampaign) => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      } else if (data.campaigns?.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data.campaigns[0]);
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim().replace(/^"|"$/g, "").split(",")[0].trim())
        .filter((l) => l.length > 2 && !l.toLowerCase().includes("organization") && !l.toLowerCase().includes("company"));
      setParsedFileOrgs(lines);
    };
    reader.readAsText(file);
  }

  async function handleLaunchOmniScrape() {
    let orgList: string[] = [];
    if (inputMode === "MANUAL") {
      orgList = orgsInput
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 1);
    } else {
      orgList = parsedFileOrgs;
    }

    if (orgList.length === 0) {
      alert("Please provide at least one organization name to harvest.");
      return;
    }

    setSubmitting(true);
    try {
      const activeSeniorities = Object.entries(seniorities)
        .filter(([_, v]) => v)
        .map(([k]) => k as SeniorityLevel);

      const res = await fetch("/api/omni-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizations: orgList,
          name: `Omni-Channel Harvest: ${orgList[0]}${orgList.length > 1 ? ` +${orgList.length - 1} more` : ""}`,
          config: {
            extractPeople,
            targetSeniorities: activeSeniorities,
            maxPeoplePerOrg,
            extractEmails,
            extractPhones,
            extractSocial,
            extractOrgDetails,
            extractGoogleMaps,
            depth,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start omni scraper");

      setModalOpen(false);
      fetchCampaigns();
      if (data.campaign) {
        setSelectedCampaign(data.campaign);
      }
    } catch (err: any) {
      alert(`Error starting scraper: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function exportDossiersToCSV(campaign: OmniCampaign) {
    if (!campaign || campaign.dossiers.length === 0) {
      alert("No extracted dossiers available yet.");
      return;
    }

    const rows: string[] = [];
    rows.push(
      [
        "Organization Name",
        "Domain",
        "Website",
        "HQ Address",
        "Switchboard Phone",
        "Corporate Email",
        "Person Full Name",
        "Designation",
        "Seniority",
        "Department",
        "Work Email",
        "Email Verified",
        "Direct Phone",
        "WhatsApp",
        "LinkedIn URL",
        "Org LinkedIn",
        "Org Twitter",
        "Google Maps Rating",
      ].join(",")
    );

    for (const dossier of campaign.dossiers) {
      const org = dossier.organizationName;
      const domain = dossier.domain;
      const web = dossier.website;
      const addr = `"${(dossier.companyData.addresses?.[0]?.fullAddress || "").replace(/"/g, '""')}"`;
      const phone = dossier.companyData.phones?.[0]?.number || "";
      const email = dossier.companyData.emails?.[0]?.address || "";
      const orgLinkedin = dossier.socialLinks.linkedin || "";
      const orgTwitter = dossier.socialLinks.twitter || "";
      const rating = dossier.companyData.googleMaps?.rating || "";

      if (dossier.people.length === 0) {
        rows.push([`"${org}"`, domain, web, addr, phone, email, "", "", "", "", "", "", "", "", "", orgLinkedin, orgTwitter, rating].join(","));
      } else {
        for (const p of dossier.people) {
          rows.push(
            [
              `"${org}"`,
              domain,
              web,
              addr,
              phone,
              email,
              `"${p.fullName}"`,
              `"${p.designation.replace(/"/g, '""')}"`,
              p.seniority,
              p.department,
              p.workEmail || "",
              p.workEmailVerified ? "YES" : "NO",
              p.mobilePhone || p.phone || "",
              p.whatsapp || "",
              p.linkedinUrl || "",
              orgLinkedin,
              orgTwitter,
              rating,
            ].join(",")
          );
        }
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OmniChannel_${campaign.name.replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeDossier: OmniOrgDossier | undefined = selectedCampaign?.dossiers[activeDossierIndex];

  const filteredPeople = activeDossier?.people.filter((p) => {
    const matchesSearch =
      peopleSearch === "" ||
      p.fullName.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      p.designation.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      (p.workEmail && p.workEmail.toLowerCase().includes(peopleSearch.toLowerCase()));

    const matchesSeniority =
      seniorityFilter === "ALL" ||
      (seniorityFilter === "DIRECTORS" && ["DIRECTOR", "CHAIRMAN", "BOARD_MEMBER"].includes(p.seniority)) ||
      (seniorityFilter === "C_SUITE" && ["C_SUITE", "VP"].includes(p.seniority)) ||
      (seniorityFilter === "MANAGERS" && ["MANAGER", "HEAD_OF_DEPT"].includes(p.seniority)) ||
      (seniorityFilter === "TEAM" && ["GENERAL", "MARKETING", "SALES"].includes(p.seniority));

    return matchesSearch && matchesSeniority;
  }) || [];

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Omni-Channel Universal Scraper
            </h1>
            <span className="text-[10px] bg-blue-500/10 text-blue-600 font-bold px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">
              360° HARVESTER
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Account-Based 360° Intelligence: Enter target organizations manually or via Excel/CSV to harvest Directors, C-Suite, complete team rosters, contact numbers, and social channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOrgsInput("Mahratta Chamber of Commerce, Industries and Agriculture (MCCIA)");
              setMaxPeoplePerOrg(100);
              setModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try MCCIA (Pune) Demo</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>+ New 360° Account Scrape</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Campaign List & Right Active Dossier Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active & Historical Campaigns */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
            <span>Omni Campaigns ({campaigns.length})</span>
            <span className="text-[10px] text-muted-foreground font-mono">Real-time Stream</span>
          </div>

          <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-foreground">No Omni Campaigns Yet</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Click "+ New 360° Account Scrape" to start harvesting organizations.
                </p>
              </div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                return (
                  <div
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaign(camp);
                      setActiveDossierIndex(0);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/10 dark:bg-blue-950/20 shadow-sm"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {camp.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                          {camp.organizations.length} Organizations &bull; {camp.dossiers.reduce((acc, d) => acc + d.people.length, 0)} Leaders
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          camp.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : camp.status === "RUNNING"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span className="font-mono font-semibold">{camp.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                          style={{ width: `${camp.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Campaign Dossier & Leadership Tree */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCampaign ? (
            <div className="p-12 text-center border border-border rounded-2xl bg-card">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-foreground">Select a Campaign to View Dossier</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Harvested leadership trees, 20+ Directors, 100+ team members, and official social footprints will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Campaign Header Toolbar */}
              <div className="p-4 bg-card border border-border rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground truncate">{selectedCampaign.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedCampaign.dossiers.length} Organizations processed &bull; {selectedCampaign.progress}% Complete
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportDossiersToCSV(selectedCampaign)}
                    className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Organization Switcher Pills */}
              {selectedCampaign.dossiers.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {selectedCampaign.dossiers.map((d, idx) => (
                    <button
                      key={d.domain + idx}
                      type="button"
                      onClick={() => {
                        setActiveDossierIndex(idx);
                        setPeopleSearch("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                        activeDossierIndex === idx
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                          : "bg-card hover:bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{d.organizationName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        activeDossierIndex === idx ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {d.people.length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Dossier Content */}
              {activeDossier ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  {/* Organization Hero Banner */}
                  <div className="p-5 border-b border-border bg-gradient-to-r from-muted/40 via-card to-blue-50/10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-foreground truncate">
                            {activeDossier.organizationName}
                          </h3>
                          <a
                            href={activeDossier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activeDossier.companyData.description || "Leading commercial organization and industrial network."}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                          {activeDossier.companyData.addresses?.[0]?.fullAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span className="truncate max-w-xs">{activeDossier.companyData.addresses[0].fullAddress}</span>
                            </span>
                          )}
                          {activeDossier.companyData.googleMaps?.rating && (
                            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{activeDossier.companyData.googleMaps.rating} ★ ({activeDossier.companyData.googleMaps.reviewCount || 0} reviews)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stat Counters */}
                      <div className="grid grid-cols-3 gap-2 shrink-0">
                        <div className="p-2.5 bg-muted/60 border border-border rounded-xl text-center min-w-[75px]">
                          <span className="block text-sm font-bold text-foreground font-mono">
                            {activeDossier.stats.directorsCount}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Directors</span>
                        </div>
                        <div className="p-2.5 bg-muted/60 border border-border rounded-xl text-center min-w-[75px]">
                          <span className="block text-sm font-bold text-foreground font-mono">
                            {activeDossier.stats.teamMembersCount}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Team</span>
                        </div>
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center min-w-[75px]">
                          <span className="block text-sm font-bold text-emerald-600 font-mono">
                            {activeDossier.stats.phoneCount}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">Phones</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Tabs: Leadership Matrix vs Org Details vs Social Footprint */}
                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setActiveTab("PEOPLE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          activeTab === "PEOPLE"
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Leadership & Team Roster ({activeDossier.people.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("ORG")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          activeTab === "ORG"
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Organization Profile & Branches</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("SOCIAL")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          activeTab === "SOCIAL"
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Omni-Channel Social Matrix</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Leadership Matrix */}
                  {activeTab === "PEOPLE" && (
                    <div className="p-4 space-y-4">
                      {/* Search & Seniority Filters */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Filter by name, title, or email..."
                            value={peopleSearch}
                            onChange={(e) => setPeopleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border rounded-lg text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                          {[
                            { id: "ALL", label: `All (${activeDossier.people.length})` },
                            { id: "DIRECTORS", label: `Directors (${activeDossier.stats.directorsCount})` },
                            { id: "C_SUITE", label: `C-Suite (${activeDossier.stats.executivesCount})` },
                            { id: "MANAGERS", label: "Managers" },
                            { id: "TEAM", label: "Secretariat & Team" },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setSeniorityFilter(tab.id)}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                seniorityFilter === tab.id
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* People Grid Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                        {filteredPeople.length === 0 ? (
                          <div className="col-span-2 p-8 text-center text-xs text-muted-foreground">
                            No team members match the current filter criteria.
                          </div>
                        ) : (
                          filteredPeople.map((person, pIdx) => {
                            const isDirector = ["DIRECTOR", "CHAIRMAN", "BOARD_MEMBER"].includes(person.seniority);
                            return (
                              <div
                                key={person.fullName + pIdx}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isDirector
                                    ? "bg-blue-50/10 dark:bg-blue-950/20 border-blue-500/30"
                                    : "bg-muted/30 border-border hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isDirector ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                                    }`}>
                                      {person.fullName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-xs text-foreground truncate">
                                        {person.fullName}
                                      </h4>
                                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                                        {person.designation}
                                      </p>
                                    </div>
                                  </div>

                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                    isDirector
                                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                      : "bg-muted text-muted-foreground"
                                  }`}>
                                    {person.seniority}
                                  </span>
                                </div>

                                {/* Contact Pill Grid */}
                                <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-2 text-[11px]">
                                  {person.workEmail && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-foreground font-mono">
                                      <Mail className="w-3 h-3 text-blue-500" />
                                      <span className="truncate max-w-[150px]">{person.workEmail}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(person.workEmail!, `em_${pIdx}`)}
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                      >
                                        {copiedKey === `em_${pIdx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  )}

                                  {(person.mobilePhone || person.phone) && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-foreground font-mono">
                                      <Phone className="w-3 h-3 text-emerald-500" />
                                      <span>{person.mobilePhone || person.phone}</span>
                                    </div>
                                  )}

                                  {person.whatsapp && (
                                    <a
                                      href={`https://wa.me/${person.whatsapp.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold hover:bg-emerald-500/20 transition-all"
                                    >
                                      <MessageSquare className="w-3 h-3 fill-current" />
                                      <span>WhatsApp</span>
                                    </a>
                                  )}

                                  {person.linkedinUrl && (
                                    <a
                                      href={person.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold hover:bg-blue-500/20 transition-all"
                                    >
                                      <span>LinkedIn</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Organization Profile & Details */}
                  {activeTab === "ORG" && (
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                            Corporate Identity
                          </h4>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Registered Entity Name</span>
                            <span className="text-xs font-semibold text-foreground">{activeDossier.organizationName}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Official Domain</span>
                            <span className="text-xs font-mono text-blue-600">{activeDossier.domain}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Industry & Sector</span>
                            <span className="text-xs font-semibold text-foreground">
                              {activeDossier.companyData.industry || "Commercial Chamber & Trade Association"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                            Direct Switchboard & Emails
                          </h4>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Verified Phone Lines</span>
                            <div className="space-y-1 mt-1">
                              {activeDossier.companyData.phones?.map((ph, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-mono text-foreground">
                                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{ph.number}</span>
                                  <span className="text-[10px] text-muted-foreground">({ph.source})</span>
                                </div>
                              )) || <span className="text-xs text-muted-foreground">No switchboard lines found</span>}
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Corporate Inquiries Emails</span>
                            <div className="space-y-1 mt-1">
                              {activeDossier.companyData.emails?.map((em, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-mono text-foreground">
                                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{em.address}</span>
                                  <span className="text-[10px] text-emerald-600 font-bold">MX VERIFIED</span>
                                </div>
                              )) || <span className="text-xs text-muted-foreground">No emails found</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Omni-Channel Social Footprint */}
                  {activeTab === "SOCIAL" && (
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {activeDossier.socialLinks.linkedin && (
                          <a
                            href={activeDossier.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                                in
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">LinkedIn Company</span>
                                <span className="text-[11px] text-muted-foreground">Official Page</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          </a>
                        )}

                        {activeDossier.socialLinks.twitter && (
                          <a
                            href={activeDossier.socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                                𝕏
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">Twitter / X</span>
                                <span className="text-[11px] text-muted-foreground">Official Channel</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          </a>
                        )}

                        {activeDossier.socialLinks.facebook && (
                          <a
                            href={activeDossier.socialLinks.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-700/10 text-blue-700 flex items-center justify-center font-bold">
                                f
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">Facebook</span>
                                <span className="text-[11px] text-muted-foreground">Community & Updates</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          </a>
                        )}

                        {activeDossier.socialLinks.youtube && (
                          <a
                            href={activeDossier.socialLinks.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center font-bold">
                                ▶
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">YouTube</span>
                                <span className="text-[11px] text-muted-foreground">Conferences & Speeches</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Execution Stream Logs */}
              <div className="p-4 bg-slate-950 text-slate-200 rounded-xl border border-border/80 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
                <div className="text-[11px] text-slate-400 font-bold mb-2 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>&gt;_ Real-Time Omni Harvester Execution Stream</span>
                  <span className="text-[10px] text-emerald-400">STATUS: {selectedCampaign.status}</span>
                </div>
                {selectedCampaign.logs.map((log, lIdx) => (
                  <div key={lIdx} className="leading-snug text-[11px]">
                    <span className="text-slate-500">[{log.timestamp}]</span>{" "}
                    <span
                      className={`font-bold ${
                        log.level === "success"
                          ? "text-emerald-400"
                          : log.level === "warn"
                          ? "text-amber-400"
                          : log.level === "error"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>{" "}
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New 360° Account Scrape Modal / Wizard */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-foreground animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Configure Omni-Channel Account Scraper
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Input organization targets and choose exact leadership designations and contact endpoints.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Step 1: Input Mode */}
              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  Step 1: Target Organization Input Method
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setInputMode("MANUAL")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      inputMode === "MANUAL"
                        ? "border-blue-600 bg-blue-50/10 text-blue-600"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>Manual Bulk Paste</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("FILE")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      inputMode === "FILE"
                        ? "border-blue-600 bg-blue-50/10 text-blue-600"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload Excel / CSV</span>
                  </button>
                </div>

                {inputMode === "MANUAL" ? (
                  <div>
                    <textarea
                      rows={3}
                      value={orgsInput}
                      onChange={(e) => setOrgsInput(e.target.value)}
                      placeholder="Enter organization names, one per line (e.g. Mahratta Chamber of Commerce, Tata Motors, Praj Industries)"
                      className="w-full p-2.5 bg-muted/40 border border-border rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-600"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">Quick samples:</span>
                      <button
                        type="button"
                        onClick={() => setOrgsInput("Mahratta Chamber of Commerce, Industries and Agriculture (MCCIA)")}
                        className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border"
                      >
                        MCCIA (Pune)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrgsInput("Tata Motors\nPraj Industries\nBharat Forge\nCummins India")}
                        className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border"
                      >
                        Pune Industrial Giants (4 Orgs)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center bg-muted/20">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.txt"
                      id="orgFileInput"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="orgFileInput" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <span className="font-bold text-foreground text-xs block">
                        {uploadedFileName || "Click to upload CSV / Excel spreadsheet"}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        {parsedFileOrgs.length > 0
                          ? `Parsed ${parsedFileOrgs.length} organization names successfully`
                          : "Supports Column A organization names"}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Step 2: What data to extract */}
              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  Step 2: Select Target Data Points & Depth
                </label>

                {/* People & Seniority Settings */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground">
                      <input
                        type="checkbox"
                        checked={extractPeople}
                        onChange={(e) => setExtractPeople(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <span>Extract People & Key Decision Makers</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      Up to {maxPeoplePerOrg} Leaders/Org
                    </span>
                  </div>

                  {extractPeople && (
                    <div className="space-y-2.5 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Designations & Seniority Depths:
                        </span>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...seniorities };
                              Object.keys(updated).forEach((k) => (updated[k as SeniorityLevel] = true));
                              setSeniorities(updated);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            Select All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: "DIRECTOR" as SeniorityLevel, label: "Directors & Managing Dir" },
                          { id: "CHAIRMAN" as SeniorityLevel, label: "Chairman & President" },
                          { id: "BOARD_MEMBER" as SeniorityLevel, label: "Board Members & Trustees" },
                          { id: "C_SUITE" as SeniorityLevel, label: "C-Suite (CEO, CTO, CFO)" },
                          { id: "VP" as SeniorityLevel, label: "Vice Presidents" },
                          { id: "HEAD_OF_DEPT" as SeniorityLevel, label: "Department Heads" },
                          { id: "MANAGER" as SeniorityLevel, label: "Senior Managers" },
                          { id: "GENERAL" as SeniorityLevel, label: "Full Secretariat & Team (100+)" },
                        ].map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded bg-card border border-border">
                            <input
                              type="checkbox"
                              checked={seniorities[s.id]}
                              onChange={(e) =>
                                setSeniorities({ ...seniorities, [s.id]: e.target.checked })
                              }
                              className="rounded text-blue-600"
                            />
                            <span className="text-[11px] font-medium text-foreground truncate">{s.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* People Quota Chips */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-muted-foreground">Team Quota:</span>
                        {[25, 50, 100, 250].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setMaxPeoplePerOrg(q)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                              maxPeoplePerOrg === q
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {q} Members
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Omni-Channel Endpoints */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractEmails}
                      onChange={(e) => setExtractEmails(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-foreground block text-[11px]">Corporate Emails</span>
                      <span className="text-[10px] text-muted-foreground">MX verified mailboxes</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractPhones}
                      onChange={(e) => setExtractPhones(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-foreground block text-[11px]">Phone & WhatsApp</span>
                      <span className="text-[10px] text-muted-foreground">Mobile & switchboard</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractSocial}
                      onChange={(e) => setExtractSocial(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-foreground block text-[11px]">Omni Social Handles</span>
                      <span className="text-[10px] text-muted-foreground">LinkedIn, X, FB, YouTube</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractGoogleMaps}
                      onChange={(e) => setExtractGoogleMaps(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-foreground block text-[11px]">Google Maps Geocoding</span>
                      <span className="text-[10px] text-muted-foreground">Ratings, reviews & location</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
              <span className="text-[11px] text-muted-foreground">
                Runs autonomously in background & persists to Central Intelligence (MongoDB Atlas).
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchOmniScrape}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Launching Harvest...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Omni Harvest</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
