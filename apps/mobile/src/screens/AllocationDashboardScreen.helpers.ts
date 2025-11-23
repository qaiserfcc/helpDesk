import {
  type AdminOverviewReport,
  type AdminProductivityReport,
  type StatusCounts,
  type TicketStatus,
} from "@/services/tickets";

export type InsightView = "agents" | "aging";
export type InsightAction =
  | { type: "select"; view: InsightView }
  | { type: "toggle" };

export type AssignmentLoadEntry = AdminOverviewReport["assignmentLoad"][number];
export type ResolutionTrendEntry =
  AdminProductivityReport["resolutionTrend"][number];

export const DEFAULT_STATUS_COUNTS: StatusCounts = {
  open: 0,
  in_progress: 0,
  resolved: 0,
};

export const INSIGHT_TABS: Array<{ label: string; value: InsightView }> = [
  { label: "Agents", value: "agents" },
  { label: "Aging", value: "aging" },
];

export function insightViewReducer(
  state: InsightView,
  action: InsightAction,
): InsightView {
  switch (action.type) {
    case "select":
      return action.view;
    case "toggle":
      return state === "agents" ? "aging" : "agents";
    default:
      return state;
  }
}

export function buildStatusBuckets(
  counts?: StatusCounts,
): Array<{ status: TicketStatus; count: number }> {
  const safeCounts: StatusCounts = {
    open: counts?.open ?? 0,
    in_progress: counts?.in_progress ?? 0,
    resolved: counts?.resolved ?? 0,
  };
  return (Object.keys(safeCounts) as TicketStatus[]).map((status) => ({
    status,
    count: safeCounts[status],
  }));
}

export type WorkloadStats = {
  averageLoad: number;
  busiestAgent: AssignmentLoadEntry | null;
  totalAgents: number;
  totalAssignments: number;
};

export function deriveWorkloadStats(
  assignments: AssignmentLoadEntry[] = [],
): WorkloadStats {
  if (!assignments || assignments.length === 0) {
    return {
      averageLoad: 0,
      busiestAgent: null,
      totalAgents: 0,
      totalAssignments: 0,
    };
  }
  const sorted = [...assignments].sort((a, b) => b.count - a.count);
  const totalAssignments = sorted.reduce((acc, item) => acc + item.count, 0);
  return {
    averageLoad: Math.round(totalAssignments / sorted.length) || 0,
    busiestAgent: sorted[0],
    totalAgents: sorted.length,
    totalAssignments,
  };
}

export type TrendSummary = {
  window: number;
  total: number;
};

export function deriveTrendSummary(
  trend: ResolutionTrendEntry[] = [],
  lookback = 7,
): TrendSummary {
  if (!trend || trend.length === 0) {
    return { window: 0, total: 0 };
  }
  const slice = trend.slice(-lookback);
  const total = slice.reduce((acc, entry) => acc + entry.count, 0);
  return { window: slice.length, total };
}
