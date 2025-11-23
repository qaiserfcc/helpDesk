import { AdminOverviewReport, StatusCounts, TicketStatus } from "@/services/tickets";

export type StatusBucket = {
  status: TicketStatus;
  count: number;
};

export type HighlightCounts = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
};

const STATUS_ORDER: TicketStatus[] = ["open", "in_progress", "resolved"];

export function getDefaultStatusCounts(): StatusCounts {
  return { open: 0, in_progress: 0, resolved: 0 };
}

export function buildStatusBuckets(
  statusCounts?: Partial<Record<TicketStatus, number>>,
): StatusBucket[] {
  const source = statusCounts ?? getDefaultStatusCounts();
  return STATUS_ORDER.map((status) => ({
    status,
    count: source[status] ?? 0,
  }));
}

export function getTotalTickets(buckets: StatusBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

export function getHighlightCounts(buckets: StatusBucket[]): HighlightCounts {
  const totals: HighlightCounts = {
    total: getTotalTickets(buckets),
    open: 0,
    inProgress: 0,
    resolved: 0,
  };

  buckets.forEach((bucket) => {
    if (bucket.status === "open") {
      totals.open = bucket.count;
    }
    if (bucket.status === "in_progress") {
      totals.inProgress = bucket.count;
    }
    if (bucket.status === "resolved") {
      totals.resolved = bucket.count;
    }
  });

  return totals;
}

export function rankAssignments(
  assignments?: AdminOverviewReport["assignmentLoad"],
): AdminOverviewReport["assignmentLoad"] {
  if (!assignments || assignments.length === 0) {
    return [] as AdminOverviewReport["assignmentLoad"];
  }
  return [...assignments].sort((a, b) => b.count - a.count);
}

export function getStatusShare(count: number, total: number): number {
  if (!total) {
    return 0;
  }
  return Math.round((count / total) * 100);
}
