import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { IssueType, Role, TicketPriority, TicketStatus } from "@prisma/client";
import {
  appendAttachments,
  assignTicket,
  createTicket,
  declineAssignmentRequest,
  getTicket,
  ingestQueuedTickets,
  listTickets,
  requestAssignment,
  resolveTicket,
  updateTicket,
} from "./ticketService.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../lib/prisma.js", () => {
  const ticket = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const user = {
    findUnique: vi.fn(),
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

const ticketRecord = {
  id: "ticket-1",
  description: "Printer is jammed",
  priority: TicketPriority.medium,
  issueType: IssueType.hardware,
  status: TicketStatus.open,
  attachments: [] as string[],
  createdBy: baseUser.id,
  assignedTo: null as string | null,
  assignmentRequestId: null as string | null,
  resolvedAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ticketWithRelations = {
  ...ticketRecord,
  creator: { id: baseUser.id, name: baseUser.name, email: baseUser.email },
  assignee: null,
  assignmentRequest: null,
};

beforeEach(() => {
  Object.values(prismaTicket).forEach((mock) => mock.mockReset());
  Object.values(prismaUser).forEach((mock) => mock.mockReset());
});

describe("listTickets", () => {
  it("limits results for standard users to their own tickets", async () => {
    prismaTicket.findMany.mockResolvedValue([ticketWithRelations]);

    const results = await listTickets({}, baseUser);

    expect(prismaTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdBy: baseUser.id }),
      }),
    );
    expect(results).toHaveLength(1);
  });
});

describe("createTicket", () => {
  it("creates a ticket with creator id populated", async () => {
    prismaTicket.create.mockResolvedValue(ticketWithRelations);

    const ticket = await createTicket(
      {
        description: ticketRecord.description,
        priority: ticketRecord.priority,
        issueType: ticketRecord.issueType,
      },
      baseUser,
    );

    expect(prismaTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: ticketRecord.description,
          createdBy: baseUser.id,
        }),
      }),
    );
    expect(ticket.id).toBe(ticketRecord.id);
  });

  it("rejects ticket creation for agents", async () => {
    await expect(
      createTicket(
        {
          description: ticketRecord.description,
          priority: ticketRecord.priority,
          issueType: ticketRecord.issueType,
        },
        agentUser,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("updateTicket", () => {
  it("prevents status changes for regular users", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);

    await expect(
      updateTicket(
        ticketRecord.id,
        { status: TicketStatus.in_progress },
        baseUser,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows the assigned agent to update status", async () => {
    prismaTicket.findUnique.mockResolvedValue({
      ...ticketRecord,
      assignedTo: agentUser.id,
    });
    prismaTicket.update.mockResolvedValue({
      ...ticketWithRelations,
      status: TicketStatus.in_progress,
    });

    const ticket = await updateTicket(
      ticketRecord.id,
      { status: TicketStatus.in_progress },
      agentUser,
    );

    expect(ticket.status).toBe(TicketStatus.in_progress);
    expect(prismaTicket.update).toHaveBeenCalled();
  });

  it("blocks agents from editing other fields", async () => {
    prismaTicket.findUnique.mockResolvedValue({
      ...ticketRecord,
      assignedTo: agentUser.id,
    });

    await expect(
      updateTicket(
        ticketRecord.id,
        { description: "Different" },
        agentUser,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaTicket.update).not.toHaveBeenCalled();
  });
});

describe("assignTicket", () => {
  it("assigns pending request when admin approves without payload", async () => {
    prismaTicket.findUnique.mockResolvedValue({
      ...ticketRecord,
      assignmentRequestId: agentUser.id,
    });
    prismaUser.findUnique.mockResolvedValue({ id: agentUser.id, role: Role.agent });
    prismaTicket.update.mockResolvedValue({
      ...ticketWithRelations,
      assignedTo: agentUser.id,
      assignee: {
        id: agentUser.id,
        name: agentUser.name,
        email: agentUser.email,
      },
    });

    const ticket = (await assignTicket(
      ticketRecord.id,
      undefined,
      adminUser,
    )) as any;

    expect(prismaTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedTo: agentUser.id }),
      }),
    );
    expect(ticket.assignee?.id).toBe(agentUser.id);
  });

  it("requires admin role", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);

    await expect(
      assignTicket(ticketRecord.id, agentUser.id, agentUser),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("requestAssignment", () => {
  it("stores pending request for agent", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);
    prismaTicket.update.mockResolvedValue({
      ...ticketWithRelations,
      assignmentRequest: {
        id: agentUser.id,
        name: agentUser.name,
        email: agentUser.email,
      },
    });

    const ticket = (await requestAssignment(
      ticketRecord.id,
      agentUser,
    )) as any;

    expect(prismaTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignmentRequestId: agentUser.id }),
      }),
    );
    expect(ticket.assignmentRequest?.id).toBe(agentUser.id);
  });

  it("rejects non-agent request", async () => {
    await expect(
      requestAssignment(ticketRecord.id, baseUser),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("declineAssignmentRequest", () => {
  it("clears pending request for admins", async () => {
    prismaTicket.findUnique.mockResolvedValue({
      ...ticketRecord,
      assignmentRequestId: agentUser.id,
    });
    prismaTicket.update.mockResolvedValue(ticketWithRelations);

    const ticket = await declineAssignmentRequest(ticketRecord.id, adminUser);

    expect(ticket.assignmentRequest).toBeNull();
    expect(prismaTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignmentRequestId: null }),
      }),
    );
  });

  it("rejects when there is no pending request", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);

    await expect(
      declineAssignmentRequest(ticketRecord.id, adminUser),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("resolveTicket", () => {
  it("sets status to resolved and stamps resolvedAt", async () => {
    prismaTicket.findUnique.mockResolvedValue({
      ...ticketRecord,
      assignedTo: agentUser.id,
    });
    prismaTicket.update.mockResolvedValue({
      ...ticketWithRelations,
      status: TicketStatus.resolved,
      resolvedAt: new Date(),
    });

    const ticket = await resolveTicket(ticketRecord.id, agentUser);

    expect(ticket.status).toBe(TicketStatus.resolved);
    expect(prismaTicket.update).toHaveBeenCalled();
  });

  it("rejects resolving when agent is not assigned", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);

    await expect(
      resolveTicket(ticketRecord.id, agentUser),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("appendAttachments", () => {
  it("concatenates attachments array", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketRecord);
    prismaTicket.update.mockResolvedValue({
      ...ticketWithRelations,
      attachments: ["path-a"],
    });

    const ticket = await appendAttachments(
      ticketRecord.id,
      ["path-a"],
      baseUser,
    );

    expect(ticket.attachments).toContain("path-a");
  });
});

describe("ingestQueuedTickets", () => {
  it("creates new tickets and maps temp ids", async () => {
    prismaTicket.create.mockResolvedValue(ticketWithRelations);

    const results = await ingestQueuedTickets(
      [
        {
          tempId: "temp-1",
          description: ticketRecord.description,
        },
      ],
      baseUser,
    );

    expect(prismaTicket.create).toHaveBeenCalledTimes(1);
    expect(results[0].tempId).toBe("temp-1");
    expect(results[0].ticket.id).toBe(ticketRecord.id);
  });
});

describe("getTicket", () => {
  it("enforces access for standard users", async () => {
    prismaTicket.findUnique.mockResolvedValue(ticketWithRelations);

    await expect(
      getTicket(ticketRecord.id, { ...baseUser, id: "other-user" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
