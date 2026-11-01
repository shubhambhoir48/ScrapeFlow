# ScrapeFlow Enterprise

> **Autonomous Web Scraping, Directory Harvesting & B2B Lead Intelligence Engine**  
> Built with Next.js 14, TypeScript, Tailwind CSS, Playwright Stealth, Cheerio, MongoDB Atlas, and Firebase Authentication. Designed strictly under **SOLID principles** and **Hexagonal Architecture**.

---

## 🌟 Executive Overview

ScrapeFlow Enterprise is a high-throughput, multi-source web extraction and intelligence platform engineered to turn unstructured public web data into verified, structured business records and decision-maker directories. 

Equipped with automated anti-bot bypass mechanisms, residential browser emulation, localized Google Maps harvesting, and recursive directory tree traversal, ScrapeFlow operates continuously in the background to build central proprietary CRM databases without manual overhead.

---

## ⚡ Core Engines & Capabilities

### 1. 🏢 Multi-Level Deep Directory Crawler
- **Recursive Frontier Traversal**: Traverses complex industrial hierarchies across seed portals, expanding through 96+ industrial subcategories and 26 alphabetical indexes ($A$–$Z$).
- **Multi-Level Extraction Depths**:
  - *Level 1 (Direct)*: Single-page fast DOM extraction.
  - *Level 2 (Category & Listings)*: Dynamic pagination through catalog listings.
  - *Level 3 (Deep Profiles)*: Visits individual company profiles to extract Schema.org JSON-LD microdata, factory locations, and executive names.
- **Unlimited Full Database Extraction**: Optional unbounded crawl mode designed for harvesting massive $100,000+$ business directories into Central Intelligence.

### 2. 📍 Google Maps Geocoded Intelligence Engine
- **Localized Entity Discovery**: Search by business category, city, state, or country.
- **Rich Contact & Reputation Data**: Retrieves verified phone numbers, street addresses, website domains, Google star ratings ($1.0$–$5.0$), and total review counts.
- **Continuous Feed Emulation**: Programmatically drives real headless Chromium sessions with infinite feed scrolling, auto-accepts consent dialogs, and filters out non-business listings.

### 3. 🌐 Social Media & Executive Profile Unmasker
- **Multi-Network Discovery**: Unmasks official LinkedIn, Twitter/X, Facebook, Instagram, YouTube, and GitHub profiles for companies and people.
- **Deep Heuristic Search**: Performs localized search queries and pattern matching to correlate business entities with verified social profiles and direct WhatsApp endpoints.

### 4. ⚡ Real-Time Autonomous Cascade Enrichment
- **Contact Unmasking**: Automatically resolves obfuscated or SMS OTP-protected phone numbers and emails by running non-blocking background lookups across secondary verified web registries.
- **Central Intelligence Synchronization**: All enriched records seamlessly persist to MongoDB Atlas with live updates reflected on the data grid.

### 5. 📊 Clay-Style Master Intelligence Data Grid
- **Wide Spreadsheet Layout**: High-density table view with sticky pinned entity names, smooth horizontal scrolling, and custom column definitions.
- **Slide-Over Detail Drawer**: Right-hand inspection panel displaying raw JSON payloads, unmasked phone logs, executive leadership teams, and timeline activity.
- **Faceted Multi-Filter System**: Instant filtering by verification status, minimum Google Maps rating, decision-maker seniority, or department.
- **Bulk Import & Export**: One-click bidirectional CSV import and CSV export formatted for HubSpot, Salesforce, and Apollo.

### 6. 🔒 Firebase Enterprise Authentication & Whitelist Guard
- **Google OAuth 2.0 Single Sign-On (Gmail)**: Seamless 1-click administrative login powered by Firebase Auth.
- **Strict Whitelist Access Control**: Programmatic route guard enforcing strict access only to approved operator emails. Unauthorized logins are safely redirected to an access restriction portal.
- **Session Persistence**: Automated token refresh and persistent session states across browser refreshes.

### 7. 🎯 Omni-Channel 360° Universal Organization Intelligence
- **Multi-Vector Entity Profiling**: Accepts single organization names or bulk batches (manual entry or CSV upload) to assemble complete 360-degree organizational dossiers (e.g. chambers of commerce like MCCIA, industry councils, enterprise conglomerates).
- **Executive Hierarchy Mapping**: Extracts key decision makers categorized by role (President, Managing Directors, Board Members, VPs, Department Heads) with verified email mailboxes, direct mobile/WhatsApp numbers, and executive LinkedIn URLs.
- **Corporate & Social Footprint Extraction**: Aggregates corporate registration numbers, headquarters addresses, branches, official domains, and all brand social channels (LinkedIn, X/Twitter, Facebook, YouTube).

### 8. 🔄 Fault-Tolerant Checkpoint Recovery & Streaming Data Ingestion
- **Zero-Data-Loss Streaming**: Scraped records are flushed directly to the central MongoDB Atlas database in real time per pathway—never held in volatile memory.
- **One-Click Pause & Resumption**: Preserves live crawl frontiers and pathway index checkpoints. In the event of network disruption or system restart, campaigns resume immediately from the exact page index.
- **Full-Page Live Telemetry Console**: Replaced cramped dialogs with an expansive, dedicated operations console featuring live progress bars, 4 KPI telemetry cards, instant keyword search, and raw worker execution logs.

### 9. ⚙️ High-Throughput Worker Fleet & Telemetry
- **Concurrent Chromium Clusters**: Configurable worker pools ($1$ to $10$ parallel headless threads) with memory optimization.
- **Stealth Anti-Detection**: Automated fingerprint masking, user-agent randomization, and human mouse jitter.
- **Live Terminal Telemetry**: Real-time worker log streaming and percent-based progress tracking.

---

## 🏛️ System Architecture

```
src/
├── core/                         # Domain Layer (Pure TypeScript, Zero External Dependencies)
│   ├── interfaces/               # Granular Contracts & Repository Interfaces (ISP, DIP)
│   └── models/                   # Strongly-typed Domain Entities (Company, Person, Campaign, Job)
├── services/                     # Business Logic & Infrastructure Implementations
│   ├── scrapers/                 # Dedicated Scraping Engines
│   │   ├── PlaywrightScraperEngine.ts    # Deep Multi-Level Directory Engine
│   │   ├── GoogleMapsScraperEngine.ts    # Geocoded Places Engine
│   │   ├── SocialMediaScraperEngine.ts   # Multi-Platform Profile Harvester
│   │   ├── DeepSiteExplorer.ts           # Automatic Field Detector & DOM Inspector
│   │   └── CampaignRunner.ts             # Orchestrator & Task Dispatcher
│   ├── enrichment/               # Autonomous Cascade Enrichment Pipelines
│   ├── queue/                    # In-Memory Concurrency Queue & Worker Fleet
│   └── sheets/                   # Bi-directional Google Sheets API v4 Sync
├── repositories/                 # Data Access Layer (MongoDB Atlas with In-Memory Fallbacks)
├── context/                      # Client State & Firebase Authentication Context
├── components/                   # Presentation Layer (Tailwind CSS, Lucide Icons)
│   ├── auth/                     # Enterprise AuthGuard & Access Denied Portals
│   └── layout/                   # Sidebar, Telemetry Header & App Shell
└── app/                          # Next.js 14 App Router
    ├── api/                      # REST API Endpoints (Campaigns, Companies, Jobs, Import)
    ├── campaigns/                # Directory Scraper & Campaign Studio
    ├── maps-scraper/             # Google Maps Scraping Console
    ├── social-scraper/           # Social Media Discovery Hub
    ├── data-explorer/            # Master Intelligence Data Grid
    ├── jobs/                     # Worker Fleet & Queue Monitor
    └── settings/                 # Anti-bot Tuning & Proxy Configurations
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **MongoDB**: MongoDB Atlas cluster or local MongoDB instance
- **Browsers**: Chromium for Playwright (`npx playwright install chromium`)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/shubhambhoir48/ScrapeFlow.git
cd ScrapeFlow
npm install
```

Install Playwright Chromium browser binaries:
```bash
npx playwright install chromium
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:
```env
# MongoDB Atlas Connection URI (Replace with your actual cluster credentials)
MONGODB_URI=mongodb+srv://<username>:<password>@<your-cluster>.mongodb.net/<database_name>?retryWrites=true&w=majority
MONGODB_DB=scrapeflow

# Scraping Engine Defaults
CRAWLEE_CONCURRENCY=3
PLAYWRIGHT_HEADLESS=true

# Optional: Google Sheets Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to access the platform.

### 4. Production Build
```bash
npm run build
npm run start
```

---

## 🛡️ Security & Whitelist Configuration

Administrative access is gated using Firebase Google Authentication. To update the authorized email whitelist, configure `NEXT_PUBLIC_AUTHORIZED_EMAILS` in `.env.local` or edit `src/lib/firebase.ts`:

```env
# Comma-separated list of approved Google accounts in .env.local
NEXT_PUBLIC_AUTHORIZED_EMAILS=admin@yourcompany.com,operator@yourcompany.com
```

---

## 📄 License
Private & Proprietary. All rights reserved.
