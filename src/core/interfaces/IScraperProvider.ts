import { Company } from "../models/Company";

export interface IScraperProvider {
  readonly name: string;
  isHealthy(): Promise<boolean>;
  scrape(target: string, options?: Record<string, any>): Promise<Partial<Company>>;
}

export interface IDomInspector {
  inspectUrl(url: string): Promise<{
    title: string;
    description?: string;
    detectedFields: Array<{
      id: string;
      name: string;
      selector: string;
      type: "text" | "link" | "image" | "number" | "price" | "email" | "table";
      sampleValue?: string;
      confidence: number;
    }>;
    jsonLdSchemas?: any[];
  }>;
}

