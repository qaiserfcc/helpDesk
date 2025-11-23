import { describe, expect, it } from "vitest";
import {
  buildStatusBuckets,
  deriveTrendSummary,
  deriveWorkloadStats,
  insightViewReducer,
} from "./AllocationDashboardScreen.helpers";

describe("AllocationDashboardScreen helpers", () => {
  it("builds status buckets with safe defaults", () => {
    const buckets = buildStatusBuckets();
    expect(buckets).toMatchInlineSnapshot(`
      [
        {
          "count": 0,
          "status": "open",
        },
        {
          "count": 0,
          "status": "in_progress",
        },
        {
          "count": 0,
          "status": "resolved",
        },
      ]
    `);
  });

  it("sorts workload stats and computes averages", () => {
    const stats = deriveWorkloadStats([
      { agentId: "2", count: 2, agent: { id: "2", name: "Beta", email: "b" } },
      { agentId: "1", count: 4, agent: { id: "1", name: "Alpha", email: "a" } },
      { agentId: "3", count: 3, agent: { id: "3", name: "Gamma", email: "c" } },
    ]);
    expect(stats).toMatchInlineSnapshot(`
      {
        "averageLoad": 3,
        "busiestAgent": {
          "agent": {
            "email": "a",
            "id": "1",
            "name": "Alpha",
          },
          "agentId": "1",
          "count": 4,
        },
        "totalAgents": 3,
        "totalAssignments": 9,
      }
    `);
  });

  it("creates trend summaries with window cap", () => {
    const trend = Array.from({ length: 10 }, (_, idx) => ({
      date: `2024-07-${idx + 1}`,
      count: idx + 1,
    }));
    const summary = deriveTrendSummary(trend, 5);
    expect(summary).toMatchInlineSnapshot(`
      {
        "total": 40,
        "window": 5,
      }
    `);
  });
});

describe("insightViewReducer", () => {
  it("selects provided view", () => {
    expect(
      insightViewReducer("agents", { type: "select", view: "aging" }),
    ).toBe("aging");
  });

  it("toggles between views", () => {
    expect(insightViewReducer("agents", { type: "toggle" })).toBe("aging");
    expect(insightViewReducer("aging", { type: "toggle" })).toBe("agents");
  });
});
