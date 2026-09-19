export type OpportunityType = "job" | "hackathon";

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  organization: string;
  description: string;
  url: string;
  source: string;
  sourceUrl: string;
  location?: string;
  remote?: boolean;
  deadline?: string;
  prize?: string;
  metadata?: Record<string, unknown>;
}
