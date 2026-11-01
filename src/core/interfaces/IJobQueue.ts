import { ScrapingJob, JobType, JobStatus, JobLog } from "../models/Job";

export interface IJobQueue {
  addJob(name: string, type: JobType, payload: Record<string, any>): Promise<ScrapingJob>;
  getJob(id: string): Promise<ScrapingJob | null>;
  getAllJobs(limit?: number): Promise<ScrapingJob[]>;
  updateJobStatus(id: string, status: JobStatus, progress?: number): Promise<ScrapingJob | null>;
  appendJobLog(id: string, log: Omit<JobLog, "timestamp">): Promise<void>;
  pauseJob(id: string): Promise<boolean>;
  resumeJob(id: string): Promise<boolean>;
  cancelJob(id: string): Promise<boolean>;
}

