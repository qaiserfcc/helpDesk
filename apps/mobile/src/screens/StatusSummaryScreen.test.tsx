import { describe, expect, it } from "vitest";
import {
  buildStatusBuckets,
  getHighlightCounts,
  getStatusShare,
  getTotalTickets,
  rankAssignments,
} from "./StatusSummaryScreen.helpers";

describe("StatusSummaryScreen helpers", () => {
  it("builds buckets in a fixed order and fills missing statuses", () => {
    const buckets = buildStatusBuckets({ open: 5, resolved: 2 });
    expect(buckets).toMatchInlineSnapshot(`
      [
        {
          "count": 5,
          "status": "open",
        },
        {
          "count": 0,
          "status": "in_progress",
        },
        {
          "count": 2,
          "status": "resolved",
        },
      ]
    `);
  });

  it("summarizes highlight counts and totals", () => {
    const buckets = buildStatusBuckets({ open: 4, in_progress: 3, resolved: 1 });
    const highlights = getHighlightCounts(buckets);
    expect(highlights).toEqual({ total: 8, open: 4, inProgress: 3, resolved: 1 });
  });

  it("derives total tickets from buckets", () => {
    const total = getTotalTickets([
      { status: "open", count: 2 },
      { status: "in_progress", count: 3 },
      { status: "resolved", count: 5 },
    ]);
    expect(total).toBe(10);
  });

  it("ranks assignments by volume and ignores empty input", () => {
    expect(rankAssignments()).toEqual([]);
    const ranked = rankAssignments([
      { agentId: "b", count: 7, agent: null },
      { agentId: "a", count: 12, agent: null },
      { agentId: "c", count: 3, agent: null },
    ]);
    expect(ranked?.map((row) => row.agentId)).toEqual(["a", "b", "c"]);
  });

  it("calculates share percentages with safe divide", () => {
    expect(getStatusShare(3, 10)).toBe(30);
    expect(getStatusShare(5, 0)).toBe(0);
  });
});
