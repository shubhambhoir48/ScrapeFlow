import { IJobQueue } from "../../core/interfaces/IJobQueue";
import { ScrapingJob, JobType, JobStatus, JobLog } from "../../core/models/Job";
import { MongoJobRepository } from "../../repositories/MongoJobRepository";

export class InMemoryJobQueue implements IJobQueue {
  private static instance: InMemoryJobQueue;
  private jobs: Map<string, ScrapingJob> = new Map();
  private repository = new MongoJobRepository();
  private isProcessing = false;
  private concurrencyLimit = 3;
  private activeWorkers = 0;

  private constructor() {
    this.startWorkerLoop();
  }

  static getInstance(): InMemoryJobQueue {
    if (!InMemoryJobQueue.instance) {
      InMemoryJobQueue.instance = new InMemoryJobQueue();
    }
    return InMemoryJobQueue.instance;
  }

  async addJob(name: string, type: JobType, payload: Record<string, any>): Promise<ScrapingJob> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalItems = Array.isArray(payload.targets) ? payload.targets.length : 1;

    const job: ScrapingJob = {
      id,
      name,
      type,
      status: "QUEUED",
      progress: 0,
      totalItems,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      payload,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Job created with ${totalItems} target(s). Ready in queue.`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    await this.repository.create(job);
    return job;
  }

  async getJob(id: string): Promise<ScrapingJob | null> {
    if (this.jobs.has(id)) {
      return this.jobs.get(id)!;
    }
    return this.repository.findOne({ id });
  }

  async getAllJobs(limit: number = 50): Promise<ScrapingJob[]> {
    const list = Array.from(this.jobs.values());
    if (list.length > 0) {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
    }
    const fromRepo = await this.repository.find({ limit });
    return fromRepo.items;
  }

  async updateJobStatus(id: string, status: JobStatus, progress?: number): Promise<ScrapingJob | null> {
    const job = await this.getJob(id);
    if (!job) return null;

    job.status = status;
    if (progress !== undefined) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
    if (status === "RUNNING" && !job.startedAt) {
      job.startedAt = new Date().toISOString();
    }
    if (status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") {
      job.completedAt = new Date().toISOString();
    }

    this.jobs.set(id, job);
    await this.repository.update(id, job);
    return job;
  }

  async appendJobLog(id: string, log: Omit<JobLog, "timestamp">): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    const entry: JobLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    job.logs.push(entry);
    // Keep max 200 logs per job in memory
    if (job.logs.length > 200) {
      job.logs = job.logs.slice(-200);
    }
    this.jobs.set(id, job);
  }

  async pauseJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job || job.status !== "RUNNING") return false;
    await this.updateJobStatus(id, "PAUSED");
    await this.appendJobLog(id, { level: "warn", message: "Job execution paused by user." });
    return true;
  }

  async resumeJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job || job.status !== "PAUSED") return false;
    await this.updateJobStatus(id, "RUNNING");
    await this.appendJobLog(id, { level: "info", message: "Job execution resumed by user." });
    return true;
  }

  async cancelJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job) return false;
    await this.updateJobStatus(id, "CANCELLED");
    await this.appendJobLog(id, { level: "error", message: "Job cancelled." });
    return true;
  }

  private startWorkerLoop() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setInterval(async () => {
      if (this.activeWorkers >= this.concurrencyLimit) return;

      // Find first queued job
      for (const job of this.jobs.values()) {
        if (job.status === "QUEUED") {
          this.executeJob(job).catch(console.error);
          break;
        }
      }
    }, 1500);
  }

  private async executeJob(job: ScrapingJob) {
    this.activeWorkers++;
    await this.updateJobStatus(job.id, "RUNNING", 5);
    await this.appendJobLog(job.id, {
      level: "info",
      message: `Worker picked up job. Concurrency: ${this.activeWorkers}/${this.concurrencyLimit}`,
    });

    try {
      // Dynamic import to break circular dependency
      const { CompanyEnrichmentOrchestrator } = await import("../enrichment/CompanyEnrichmentOrchestrator");
      const orchestrator = new CompanyEnrichmentOrchestrator();

      const targets: string[] = job.payload.targets || [job.payload.target];
      const total = targets.length;

      for (let i = 0; i < total; i++) {
        // Check if job was paused or cancelled while running
        const currentJob = this.jobs.get(job.id);
        if (currentJob?.status === "PAUSED") {
          while (this.jobs.get(job.id)?.status === "PAUSED") {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
        if (this.jobs.get(job.id)?.status === "CANCELLED") {
          break;
        }

        const target = targets[i];
        await this.appendJobLog(job.id, {
          level: "info",
          message: `[${i + 1}/${total}] Scraping & verifying: ${target}`,
        });

        try {
          const enriched = await orchestrator.enrichCompany(target, {
            liveSyncToSheet: job.payload.liveSyncToSheet,
            spreadsheetId: job.payload.spreadsheetId,
            sheetName: job.payload.sheetName,
            audienceType: job.payload.audienceType,
            entityType: job.payload.entityType,
            selectedSeniorities: job.payload.selectedSeniorities,
            selectedDepartments: job.payload.selectedDepartments,
            customKeywords: job.payload.customKeywords,
            depth: job.payload.depth,
          });

          job.successfulItems++;
          await this.appendJobLog(job.id, {
            level: "success",
            message: `[${i + 1}/${total}] Successfully enriched ${enriched.companyName || target} (${enriched.verificationStatus})`,
          });
        } catch (itemErr: any) {
          job.failedItems++;
          await this.appendJobLog(job.id, {
            level: "error",
            message: `[${i + 1}/${total}] Error enriching ${target}: ${itemErr.message}`,
          });
        }

        job.processedItems = i + 1;
        const progress = Math.round(((i + 1) / total) * 100);
        await this.updateJobStatus(job.id, "RUNNING", progress);
      }

      await this.updateJobStatus(job.id, "COMPLETED", 100);
      await this.appendJobLog(job.id, {
        level: "success",
        message: `Job finished! Processed: ${job.processedItems}, Success: ${job.successfulItems}, Failed: ${job.failedItems}`,
      });
    } catch (err: any) {
      job.errorMessage = err.message;
      await this.updateJobStatus(job.id, "FAILED");
      await this.appendJobLog(job.id, {
        level: "error",
        message: `Fatal job failure: ${err.message}`,
      });
    } finally {
      this.activeWorkers--;
    }
  }
}

