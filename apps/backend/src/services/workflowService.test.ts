import { describe, it, expect, beforeEach, vi } from "vitest";
import { Role, WorkflowStepAction } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  listWorkflows,
  createWorkflow,
  createWorkflowStep,
  evaluateWorkflowForTicket,
  canUserPerformAction,
} from "./workflowService.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    workflowDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workflowStep: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticketCategory: {
      findUnique: vi.fn(),
    },
  },
}));

describe("workflowService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listWorkflows", () => {
    it("should list all workflows", async () => {
      const mockWorkflows = [
        {
          id: "wf1",
          name: "IT Support Workflow",
          description: "Standard IT support process",
          categoryId: "cat1",
          version: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: "cat1",
            name: "IT Support",
            description: "IT issues",
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          steps: [],
        },
      ];

      vi.mocked(prisma.workflowDefinition.findMany).mockResolvedValue(
        mockWorkflows,
      );

      const result = await listWorkflows();

      expect(result).toEqual(mockWorkflows);
      expect(prisma.workflowDefinition.findMany).toHaveBeenCalledWith({
        where: { categoryId: undefined, active: undefined },
        include: {
          category: true,
          steps: { orderBy: { order: "asc" } },
        },
        orderBy: { name: "asc" },
      });
    });

    it("should filter workflows by category", async () => {
      vi.mocked(prisma.workflowDefinition.findMany).mockResolvedValue([]);

      await listWorkflows("cat1");

      expect(prisma.workflowDefinition.findMany).toHaveBeenCalledWith({
        where: { categoryId: "cat1", active: undefined },
        include: expect.any(Object),
        orderBy: { name: "asc" },
      });
    });
  });

  describe("createWorkflow", () => {
    it("should create a new workflow", async () => {
      const input = {
        name: "HR Workflow",
        description: "HR process",
        categoryId: "cat2",
        version: 1,
        active: true,
      };

      const mockCategory = {
        id: "cat2",
        name: "HR Support",
        description: "HR issues",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreated = {
        id: "wf2",
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
        steps: [],
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(
        mockCategory,
      );
      vi.mocked(prisma.workflowDefinition.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.workflowDefinition.create).mockResolvedValue(
        mockCreated,
      );

      const result = await createWorkflow(input);

      expect(result).toEqual(mockCreated);
      expect(prisma.workflowDefinition.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          version: input.version,
          active: input.active,
        },
        include: {
          category: true,
          steps: true,
        },
      });
    });

    it("should throw 404 error when category not found", async () => {
      const input = {
        name: "Test Workflow",
        categoryId: "invalid",
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(null);

      await expect(createWorkflow(input)).rejects.toThrow("Category not found");
    });
  });

  describe("createWorkflowStep", () => {
    it("should create a new workflow step", async () => {
      const input = {
        workflowId: "wf1",
        name: "Initial Review",
        description: "Agent reviews the ticket",
        order: 0,
        initiatorRole: Role.agent,
        allowedActions: [
          WorkflowStepAction.update,
          WorkflowStepAction.assign,
        ],
      };

      const mockWorkflow = {
        id: "wf1",
        name: "IT Workflow",
        description: "IT process",
        categoryId: "cat1",
        version: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreated = {
        id: "step1",
        workflowId: input.workflowId,
        name: input.name,
        description: input.description,
        order: input.order,
        initiatorRole: input.initiatorRole,
        allowedActions: input.allowedActions as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        workflow: mockWorkflow,
      };

      vi.mocked(prisma.workflowDefinition.findUnique).mockResolvedValue(
        mockWorkflow,
      );
      vi.mocked(prisma.workflowStep.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.workflowStep.create).mockResolvedValue(mockCreated);

      const result = await createWorkflowStep(input);

      expect(result).toEqual(mockCreated);
      expect(prisma.workflowStep.create).toHaveBeenCalled();
    });

    it("should throw 404 error when workflow not found", async () => {
      const input = {
        workflowId: "invalid",
        name: "Test Step",
        order: 0,
        allowedActions: [WorkflowStepAction.update],
      };

      vi.mocked(prisma.workflowDefinition.findUnique).mockResolvedValue(null);

      await expect(createWorkflowStep(input)).rejects.toThrow(
        "Workflow not found",
      );
    });
  });

  describe("evaluateWorkflowForTicket", () => {
    it("should return the active workflow for a category", async () => {
      const mockWorkflow = {
        id: "wf1",
        name: "IT Workflow",
        description: "IT process",
        categoryId: "cat1",
        version: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: "cat1",
          name: "IT Support",
          description: "IT issues",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        steps: [],
      };

      vi.mocked(prisma.workflowDefinition.findFirst).mockResolvedValue(
        mockWorkflow,
      );

      const result = await evaluateWorkflowForTicket("cat1", Role.user);

      expect(result).toEqual(mockWorkflow);
      expect(prisma.workflowDefinition.findFirst).toHaveBeenCalledWith({
        where: {
          categoryId: "cat1",
          active: true,
        },
        include: {
          category: true,
          steps: { orderBy: { order: "asc" } },
        },
        orderBy: { version: "desc" },
      });
    });

    it("should return null when categoryId is null", async () => {
      const result = await evaluateWorkflowForTicket(null, Role.user);

      expect(result).toBeNull();
      expect(prisma.workflowDefinition.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("canUserPerformAction", () => {
    it("should return true when user role matches and action is allowed", async () => {
      const mockStep = {
        id: "step1",
        workflowId: "wf1",
        name: "Review",
        description: null,
        order: 0,
        initiatorRole: Role.agent,
        allowedActions: [
          WorkflowStepAction.update,
          WorkflowStepAction.assign,
        ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workflowStep.findUnique).mockResolvedValue(mockStep);

      const result = await canUserPerformAction(
        "step1",
        WorkflowStepAction.update,
        Role.agent,
      );

      expect(result).toBe(true);
    });

    it("should return false when user role does not match", async () => {
      const mockStep = {
        id: "step1",
        workflowId: "wf1",
        name: "Review",
        description: null,
        order: 0,
        initiatorRole: Role.agent,
        allowedActions: [WorkflowStepAction.update] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workflowStep.findUnique).mockResolvedValue(mockStep);

      const result = await canUserPerformAction(
        "step1",
        WorkflowStepAction.update,
        Role.user,
      );

      expect(result).toBe(false);
    });

    it("should return true when initiatorRole is null (any role)", async () => {
      const mockStep = {
        id: "step1",
        workflowId: "wf1",
        name: "Review",
        description: null,
        order: 0,
        initiatorRole: null,
        allowedActions: [WorkflowStepAction.update] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workflowStep.findUnique).mockResolvedValue(mockStep);

      const result = await canUserPerformAction(
        "step1",
        WorkflowStepAction.update,
        Role.user,
      );

      expect(result).toBe(true);
    });
  });
});
