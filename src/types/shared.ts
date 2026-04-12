export type Role = "DEV" | "TL" | "PM";

export type Project = {
  id: string;
  tenantId: string;
  name: string;
};

export type UpdateRow = {
  id: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  projectId: string;
  projectName: string;
  title: string;
  originalBody: string;
  enrichedBody: string;
  riskDetected: boolean;
  riskKeywords: string[];
  hours: number;
  nextPlan: string;
  blockers: boolean;
  createdAt: string;
  feedbackUp: number;
  feedbackDown: number;
};

export type EnhanceResponse = {
  enriched: string;
  risk: boolean;
  riskKeywords: string[];
  inappropriate: boolean;
  inappropriateKeywords: string[];
};
