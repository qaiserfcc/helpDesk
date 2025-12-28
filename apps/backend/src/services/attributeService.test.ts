import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { AttributeType, Role } from "@prisma/client";
import {
  createAttribute,
  listAttributes,
  getAttribute,
  updateAttribute,
  deleteAttribute,
  validateTicketAttributes,
} from "./attributeService.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../lib/prisma.js", () => {
  const ticketAttribute = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const ticketAttributeValue = {
    findMany: vi.fn(),
    upsert: vi.fn(),
  };
  return { prisma: { ticketAttribute, ticketAttributeValue } };
});

const prismaTicketAttribute =
  prisma.ticketAttribute as unknown as Record<string, Mock>;
const prismaTicketAttributeValue =
  prisma.ticketAttributeValue as unknown as Record<string, Mock>;

const adminUser: Express.AuthenticatedUser = {
  id: "admin-123",
  email: "admin@test.com",
  name: "Admin User",
  role: Role.admin,
};

const agentUser: Express.AuthenticatedUser = {
  id: "agent-123",
  email: "agent@test.com",
  name: "Agent User",
  role: Role.agent,
};

const regularUser: Express.AuthenticatedUser = {
  id: "user-123",
  email: "user@test.com",
  name: "Regular User",
  role: Role.user,
};

describe("attributeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAttribute", () => {
    it("should allow admin to create attribute", async () => {
      const newAttribute = {
        id: "attr-123",
        name: "priority",
        label: "Priority",
        type: AttributeType.select,
        options: ["low", "medium", "high"],
        defaultValue: "medium",
        isMandatory: true,
        isVisible: true,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaTicketAttribute.findUnique.mockResolvedValue(null);
      prismaTicketAttribute.create.mockResolvedValue(newAttribute);

      const result = await createAttribute(
        {
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          options: ["low", "medium", "high"],
          defaultValue: "medium",
          isMandatory: true,
          isVisible: true,
        },
        adminUser,
      );

      expect(result).toEqual(newAttribute);
      expect(prismaTicketAttribute.create).toHaveBeenCalled();
    });

    it("should reject non-admin users", async () => {
      await expect(
        createAttribute(
          {
            name: "priority",
            label: "Priority",
            type: AttributeType.text,
          },
          agentUser,
        ),
      ).rejects.toThrow("Only admins can manage ticket attributes");
    });

    it("should require options for select type", async () => {
      prismaTicketAttribute.findUnique.mockResolvedValue(null);

      await expect(
        createAttribute(
          {
            name: "priority",
            label: "Priority",
            type: AttributeType.select,
            options: [],
          },
          adminUser,
        ),
      ).rejects.toThrow("Options are required for select and multiselect types");
    });

    it("should reject duplicate attribute names", async () => {
      prismaTicketAttribute.findUnique.mockResolvedValue({
        id: "existing-attr",
        name: "priority",
      });

      await expect(
        createAttribute(
          {
            name: "priority",
            label: "Priority",
            type: AttributeType.text,
          },
          adminUser,
        ),
      ).rejects.toThrow("Attribute with this name already exists");
    });
  });

  describe("listAttributes", () => {
    it("should return all attributes for admin", async () => {
      const attributes = [
        {
          id: "attr-1",
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          isVisible: true,
        },
        {
          id: "attr-2",
          name: "impact",
          label: "Impact",
          type: AttributeType.text,
          isVisible: false,
        },
      ];

      prismaTicketAttribute.findMany.mockResolvedValue(attributes);

      const result = await listAttributes(adminUser);

      expect(result).toEqual(attributes);
      expect(prismaTicketAttribute.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { order: "asc" },
      });
    });

    it("should return only visible attributes for non-admin", async () => {
      const attributes = [
        {
          id: "attr-1",
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          isVisible: true,
        },
      ];

      prismaTicketAttribute.findMany.mockResolvedValue(attributes);

      const result = await listAttributes(regularUser);

      expect(result).toEqual(attributes);
      expect(prismaTicketAttribute.findMany).toHaveBeenCalledWith({
        where: { isVisible: true },
        orderBy: { order: "asc" },
      });
    });
  });

  describe("updateAttribute", () => {
    it("should allow admin to update attribute", async () => {
      const existingAttribute = {
        id: "attr-123",
        name: "priority",
        type: AttributeType.select,
        options: ["low", "medium", "high"],
      };

      const updatedAttribute = {
        ...existingAttribute,
        label: "Updated Priority",
      };

      prismaTicketAttribute.findUnique.mockResolvedValue(existingAttribute);
      prismaTicketAttribute.update.mockResolvedValue(updatedAttribute);

      const result = await updateAttribute(
        "attr-123",
        { label: "Updated Priority" },
        adminUser,
      );

      expect(result).toEqual(updatedAttribute);
      expect(prismaTicketAttribute.update).toHaveBeenCalled();
    });

    it("should reject non-admin users", async () => {
      await expect(
        updateAttribute("attr-123", { label: "New Label" }, agentUser),
      ).rejects.toThrow("Only admins can manage ticket attributes");
    });
  });

  describe("deleteAttribute", () => {
    it("should allow admin to delete attribute", async () => {
      prismaTicketAttribute.findUnique.mockResolvedValue({
        id: "attr-123",
        name: "priority",
      });

      const result = await deleteAttribute("attr-123", adminUser);

      expect(result).toEqual({ success: true });
      expect(prismaTicketAttribute.delete).toHaveBeenCalledWith({
        where: { id: "attr-123" },
      });
    });

    it("should reject non-admin users", async () => {
      await expect(deleteAttribute("attr-123", regularUser)).rejects.toThrow(
        "Only admins can manage ticket attributes",
      );
    });
  });

  describe("validateTicketAttributes", () => {
    it("should validate mandatory attributes", async () => {
      const attributes = [
        {
          id: "attr-1",
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          options: ["low", "medium", "high"],
          isMandatory: true,
          isVisible: true,
        },
      ];

      prismaTicketAttribute.findMany.mockResolvedValue(attributes);

      await expect(
        validateTicketAttributes({ "attr-1": "" }),
      ).rejects.toThrow("Priority is required");
    });

    it("should validate select options", async () => {
      const attributes = [
        {
          id: "attr-1",
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          options: ["low", "medium", "high"],
          isMandatory: false,
          isVisible: true,
        },
      ];

      prismaTicketAttribute.findMany.mockResolvedValue(attributes);

      await expect(
        validateTicketAttributes({ "attr-1": "invalid" }),
      ).rejects.toThrow("Invalid value for Priority");
    });

    it("should pass validation for valid attributes", async () => {
      const attributes = [
        {
          id: "attr-1",
          name: "priority",
          label: "Priority",
          type: AttributeType.select,
          options: ["low", "medium", "high"],
          isMandatory: true,
          isVisible: true,
        },
      ];

      prismaTicketAttribute.findMany.mockResolvedValue(attributes);

      await expect(
        validateTicketAttributes({ "attr-1": "high" }),
      ).resolves.not.toThrow();
    });
  });
});
