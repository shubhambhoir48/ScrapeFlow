import { OmniChannelScraperEngine, OmniScrapeConfig, OmniOrgDossier } from "./OmniChannelScraperEngine";

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
    }
    return OmniPipelineManager.instance;
  }

  getAllCampaigns(): OmniCampaign[] {
    return Array.from(this.campaigns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCampaign(id: string): OmniCampaign | undefined {
    return this.campaigns.get(id);
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

    // Launch non-blocking background worker
    this.runCampaignInBackground(id);

    return camp;
  }

  private async runCampaignInBackground(id: string) {
    const camp = this.campaigns.get(id);
    if (!camp) return;

    camp.status = "RUNNING";
    const total = camp.organizations.length;

    try {
      for (let i = 0; i < total; i++) {
        const org = camp.organizations[i];
        camp.currentOrg = org;
        camp.logs.push({
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: `[${i + 1}/${total}] Commencing 360° Omni-Channel Harvest for: "${org}"`,
        });

        const dossier = await this.engine.harvestOrganization(org, camp.config, async (logEntry) => {
          camp.logs.push({
            timestamp: new Date().toLocaleTimeString(),
            level: logEntry.level,
            message: logEntry.message,
          });
        });

        camp.dossiers.push(dossier);
        camp.progress = Math.round(((i + 1) / total) * 100);
      }

      camp.status = "COMPLETED";
      camp.progress = 100;
      camp.completedAt = new Date().toISOString();
      camp.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: "success",
        message: `Omni-Channel Campaign completed successfully! Extracted dossiers for ${camp.dossiers.length} organizations.`,
      });
    } catch (err: any) {
      camp.status = "FAILED";
      camp.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: "error",
        message: `Campaign execution failed: ${err.message}`,
      });
    }
  }
}

