import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { IssueType, Role, TicketPriority, TicketStatus } from "@prisma/client";
import {
  getAdminOverviewReport,
  getAgentWorkloadReport,
  getTicketExportDataset,
  getUserTicketReport,
  ticketsToCsv,
  type ReportTicket,
} from "./reportService.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../lib/prisma.js", () => {
  const ticket = {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  };
  const user = {
    findMany: vi.fn(),
  };
  return { prisma: { ticket, user } };
});

const prismaTicket = prisma.ticket as unknown as Record<string, Mock>;
const prismaUser = prisma.user as unknown as Record<string, Mock>;

const baseUser: Express.AuthenticatedUser = {
  id: "user-1",
  name: "Demo User",
  email: "demo@example.com",
  role: Role.user,
};

const agentUser: Express.AuthenticatedUser = {
  ...baseUser,
  id: "agent-1",
  role: Role.agent,
};

const adminUser: Express.AuthenticatedUser = {
  ...baseUser,
  id: "admin-1",
  role: Role.admin,
};

const reportTicket: ReportTicket = {
  id: "ticket-1",
  description: "Demo",
  issueType: IssueType.hardware,
  priority: TicketPriority.medium,
  status: TicketStatus.open,
  createdAt: new Date("2023-01-01T00:00:00.000Z"),
  updatedAt: new Date("2023-01-02T00:00:00.000Z"),
  resolvedAt: null,
  creator: { id: "user-1", name: "Demo User", email: "demo@example.com" },
  assignee: { id: "agent-1", name: "Agent", email: "agent@example.com" },
};

beforeEach(() => {
  Object.values(prismaTicket).forEach((mock) => mock.mockReset());
  Object.values(prismaUser).forEach((mock) => mock.mockReset());
});

describe("getUserTicketReport", () => {
  it("aggregates tickets for a user", async () => {
    prismaTicket.findMany.mockResolvedValueOnce([reportTicket]);
    prismaTicket.groupBy.mockResolvedValueOnce([
      { status: TicketStatus.open, _count: { _all: 1 } },
    ]);

    const report = await getUserTicketReport(baseUser);

    expect(report.tickets).toHaveLength(1);
    expect(report.statusCounts.open).toBe(1);
    expect(prismaTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: baseUser.id } }),
    );
  });
});

describe("getAgentWorkloadReport", () => {
  it("includes assigned tickets, pending requests, and escalations", async () => {
    const agedTicket = {
      ...reportTicket,
      status: TicketStatus.in_progress,
      priority: TicketPriority.high,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 100),
    };

    prismaTicket.findMany
      .mockResolvedValueOnce([agedTicket])
      .mockResolvedValueOnce([reportTicket]);
    prismaTicket.groupBy.mockResolvedValueOnce([
      { status: TicketStatus.in_progress, _count: { _all: 1 } },
    ]);

    const report = await getAgentWorkloadReport(agentUser);

    expect(report.assigned).toHaveLength(1);
    expect(report.pendingRequests).toHaveLength(1);
    expect(report.escalations).toHaveLength(1);
    expect(report.statusCounts.in_progress).toBe(1);
  });
});

describe("getAdminOverviewReport", () => {
  it("returns status counts and assignment load", async () => {
    prismaTicket.groupBy
      .mockResolvedValueOnce([
        { status: TicketStatus.open, _count: { _all: 5 } },
      ])
      .mockResolvedValueOnce([
        { assignedTo: agentUser.id, _count: { _all: 3 } },
      ]);
    prismaUser.findMany.mockResolvedValueOnce([
      { id: agentUser.id, name: "Agent", email: "agent@example.com" },
    ]);
    prismaTicket.findMany.mockResolvedValueOnce([reportTicket]);

    const report = await getAdminOverviewReport(adminUser);

    expect(report.statusCounts.open).toBe(5);
    expect(report.assignmentLoad[0]?.count).toBe(3);
    expect(report.oldestOpen).toHaveLength(1);
  });
});

describe("getTicketExportDataset", () => {
  it("scopes exports to the requesting user", async () => {
    prismaTicket.findMany.mockResolvedValueOnce([reportTicket]);

    const dataset = await getTicketExportDataset(baseUser, "auto", {});

    expect(dataset.scope).toBe("user");
    expect(prismaTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: baseUser.id } }),
    );
  });

  it("prevents agents from exporting other agent workloads", async () => {
    await expect(
      getTicketExportDataset(agentUser, "agent", { agentId: "someone-else" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("ticketsToCsv", () => {
  it("renders rows with headers", () => {
    const csv = ticketsToCsv([reportTicket]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain("ticket-1");
  });

  it("returns headers when dataset is empty", () => {
    const csv = ticketsToCsv([]);
    expect(csv).toBe(
      "id,description,status,priority,issueType,creator,assignee,createdAt,resolvedAt",
    );
  });
});
