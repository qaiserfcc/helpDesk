import { describe, expect, it } from "vitest";
import {
  AdminAggregates,
  buildAdminAggregates,
  buildNoDataMessage,
  buildSectionSubtitle,
  countTicketStatuses,
  filterTicketsByStatus,
  selectAdminAggregate,
  sliceTableRows,
} from "./ReportsTableScreen.helpers";
import type { ReportTicket } from "@/services/tickets";

function makeTicket(overrides: Partial<ReportTicket> = {}): ReportTicket {
  const timestamp = overrides.updatedAt ?? new Date("2024-01-01").toISOString();
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2, 10),
    description: overrides.description ?? "Example ticket",
    priority: overrides.priority ?? "low",
    issueType: overrides.issueType ?? "access",
    status: overrides.status ?? "open",
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: timestamp,
    resolvedAt: overrides.resolvedAt ?? null,
    creator:
      overrides.creator ??
      {
        id: "creator-1",
        name: "Creator One",
        email: "creator@example.com",
      },
    assignee: overrides.assignee ?? null,
  };
}

describe("ReportsTableScreen helpers", () => {
  it("counts tickets per status with defaults", () => {
    const tickets = [
      makeTicket({ status: "open" }),
      makeTicket({ status: "resolved" }),
      makeTicket({ status: "resolved" }),
    ];
    expect(countTicketStatuses(tickets)).toEqual({
      open: 1,
      in_progress: 0,
      resolved: 2,
    });
  });

  it("filters tickets by status selection", () => {
    const tickets = [
      makeTicket({ id: "a", status: "open" }),
      makeTicket({ id: "b", status: "in_progress" }),
    ];
    expect(filterTicketsByStatus(tickets, "all")).toHaveLength(2);
    expect(filterTicketsByStatus(tickets, "open")).toEqual([
      expect.objectContaining({ id: "a" }),
    ]);
  });

  it("limits the number of table rows", () => {
    const tickets = Array.from({ length: 5 }, (_, index) => makeTicket({ id: `${index}` }));
    expect(sliceTableRows(tickets, 2)).toHaveLength(2);
  });

  it("builds admin aggregates grouped by user and agent", () => {
    const tickets = [
      makeTicket({
        id: "one",
        status: "open",
        creator: { id: "user-1", name: "A", email: "a@example.com" },
        assignee: { id: "agent-1", name: "Agent A", email: "agent@example.com" },
      }),
      makeTicket({
        id: "two",
        status: "resolved",
        creator: { id: "user-1", name: "A", email: "a@example.com" },
        assignee: { id: "agent-1", name: "Agent A", email: "agent@example.com" },
      }),
      makeTicket({
        id: "three",
        status: "in_progress",
        creator: { id: "user-2", name: "B", email: "b@example.com" },
        assignee: null,
      }),
    ];
    const aggregates = buildAdminAggregates(tickets);
    expect(aggregates.user).toMatchInlineSnapshot(`
      [
        {
          "id": "user-1",
          "in_progress": 0,
          "label": "A",
          "open": 1,
          "resolved": 1,
          "total": 2,
        },
        {
          "id": "user-2",
          "in_progress": 1,
          "label": "B",
          "open": 0,
          "resolved": 0,
          "total": 1,
        },
      ]
    `);
    expect(aggregates.agent[0]).toMatchObject({ id: "agent-1", total: 2 });
  });

  it("selects admin aggregates by view", () => {
    const aggregates: AdminAggregates = { user: [{ id: "u", label: "U", total: 1, open: 1, in_progress: 0, resolved: 0 }], agent: [] };
    expect(selectAdminAggregate("user", aggregates)).toHaveLength(1);
    expect(selectAdminAggregate("agent", aggregates)).toEqual([]);
  });

  it("builds section subtitles based on role and filter", () => {
    const subtitle = buildSectionSubtitle({
      role: "admin",
      statusFilter: "all",
      tableLength: 0,
      filteredLength: 0,
      aggregateLength: 3,
      adminView: "agent",
    });
    expect(subtitle).toBe("3 agents tracked");

    const fallback = buildSectionSubtitle({
      role: "agent",
      statusFilter: "open",
      tableLength: 10,
      filteredLength: 15,
      aggregateLength: 0,
      adminView: "user",
    });
    expect(fallback).toBe("Showing 10 of 15 tickets");
  });

  it("builds context aware empty state messages", () => {
    expect(buildNoDataMessage({ role: "admin", statusFilter: "all" })).toBe(
      "No ticket activity to summarize yet.",
    );
    expect(buildNoDataMessage({ role: "agent", statusFilter: "all" })).toBe(
      "No tickets available for this filter.",
    );
  });
});
