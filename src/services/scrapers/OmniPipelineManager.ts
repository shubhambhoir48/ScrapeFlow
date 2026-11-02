import { OmniChannelScraperEngine, OmniScrapeConfig, OmniOrgDossier } from "./OmniChannelScraperEngine";
import fs from "fs";
import path from "path";

function getOmniStorePath(): string {
  const tmpDir = process.platform === "win32" ? process.cwd() : "/tmp";
  return path.join(tmpDir, ".scrapeflow_omni.json");
}

function readOmniDisk(): OmniCampaign[] {
  try {
    const p = getOmniStorePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeOmniDisk(camps: OmniCampaign[]): void {
  try {
    const p = getOmniStorePath();
    fs.writeFileSync(p, JSON.stringify(camps, null, 2), "utf-8");
  } catch {}
}

export interface OmniCampaign {
  id: string;
  name: string;
  organizations: string[];
  config: OmniScrapeConfig;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  currentOrg: string;
  dossiers: OmniOrgDossier[];
  logs: { timestamp: string; level: "info" | "warn" | "success" | "error"; message: string }[];
  createdAt: string;
  completedAt?: string;
}

export class OmniPipelineManager {
  private static instance: OmniPipelineManager;
  private campaigns: Map<string, OmniCampaign> = new Map();
  private engine = new OmniChannelScraperEngine();

  public static getInstance(): OmniPipelineManager {
    if (!OmniPipelineManager.instance) {
      OmniPipelineManager.instance = new OmniPipelineManager();
      const onDisk = readOmniDisk();
      for (const c of onDisk) {
        if (c.id) OmniPipelineManager.instance.campaigns.set(c.id, c);
      }
    }
    return OmniPipelineManager.instance;
  }

  getAllCampaigns(): OmniCampaign[] {
    const onDisk = readOmniDisk();
    for (const c of onDisk) {
      if (c.id && !this.campaigns.has(c.id)) {
        this.campaigns.set(c.id, c);
      }
    }
    return Array.from(this.campaigns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCampaign(id: string): OmniCampaign | undefined {
    if (this.campaigns.has(id)) return this.campaigns.get(id);
    const onDisk = readOmniDisk();
    const found = onDisk.find((c) => c.id === id);
    if (found && found.id) {
      this.campaigns.set(found.id, found);
      return found;
    }
    return undefined;
  }

  createCampaign(organizations: string[], config: OmniScrapeConfig, name?: string): OmniCampaign {
    const id = `omni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const camp: OmniCampaign = {
      id,
      name: name || `Omni-Channel Harvest (${organizations.length} Organizations)`,
      organizations,
      config,
      status: "PENDING",
      progress: 0,
      currentOrg: organizations[0] || "",
      dossiers: [],
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: `Campaign initialized for ${organizations.length} organizations: ${organizations.slice(0, 3).join(", ")}${organizations.length > 3 ? "..." : ""}`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    this.campaigns.set(id, camp);
    writeOmniDisk(Array.from(this.campaigns.values()));

    // Launch background worker
    this.runCampaignInBackground(id);

    return camp;
  }

  private async runCampaignInBackground(id: string) {
    const camp = this.campaigns.get(id);
    if (!camp) return;

    camp.status = "RUNNING";
    const total = camp.organizations.length;
    writeOmniDisk(Array.from(this.campaigns.values()));

    try {
      for (let i = 0; i < total; i++) {
        const org = camp.organizations[i];
        camp.currentOrg = org;
        camp.logs.push({
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: `[${i + 1}/${total}] Commencing 360° Omni-Channel Harvest for: "${org}"`,
        });
        writeOmniDisk(Array.from(this.campaigns.values()));

        const dossier = await this.engine.harvestOrganization(org, camp.config, async (logEntry) => {
          camp.logs.push({
            timestamp: new Date().toLocaleTimeString(),
            level: logEntry.level,
            message: logEntry.message,
          });
          writeOmniDisk(Array.from(this.campaigns.values()));
        });

        camp.dossiers.push(dossier);
        camp.progress = Math.round(((i + 1) / total) * 100);
        writeOmniDisk(Array.from(this.campaigns.values()));
      }

      camp.status = "COMPLETED";
      camp.progress = 100;
      camp.completedAt = new Date().toISOString();
      camp.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: "success",
        message: `Omni-Channel Campaign completed successfully! Extracted dossiers for ${camp.dossiers.length} organizations.`,
      });
      writeOmniDisk(Array.from(this.campaigns.values()));
    } catch (err: any) {
      camp.status = "FAILED";
      camp.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: "error",
        message: `Campaign execution failed: ${err.message}`,
      });
      writeOmniDisk(Array.from(this.campaigns.values()));
    }
  }
}
