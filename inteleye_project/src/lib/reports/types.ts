export type JsonRecord = Record<string, unknown>;

export type BranchOption = {
  id: number;
  name: string;
};

export type PlatformOption = {
  id: number;
  branchId: number | null;
  name: string;
};

export type ReportStatus =
  | "queued"
  | "pending"
  | "processing"
  | "completed"
  | "no_data"
  | "failed";

export type ReportUrgentCase = {
  key: string;
  text: string;
  platformName: string;
  publishedAt: string | null;
  sentiment: string | null;
  severity: string | null;
  categories: string[];
  rating: number | null;
  needsReply: boolean;
};

export type ReportListItem = {
  key: string;
  reportId: number | null;
  requestId: string | null;
  title: string;
  reportType: string;
  branchId: number | null;
  branchName: string;
  platformId: number | null;
  platformName: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string | null;
  status: ReportStatus;
  totalFeedback: number;
  stats: JsonRecord | null;
  aiSummary: JsonRecord | null;
  urgentCases: ReportUrgentCase[];
};

export type ReportsSnapshot = {
  reports: ReportListItem[];
  branches: BranchOption[];
  platforms: PlatformOption[];
};

export type ReportRequestPayload = {
  reportName?: string;
  branchId: number;
  platformIds: number[];
  reportType: "custom" | "comparison";
  periodStart: string;
  periodEnd: string;
};
