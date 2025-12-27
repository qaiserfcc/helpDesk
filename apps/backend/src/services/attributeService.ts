import createError from "http-errors";
import { AttributeType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type CreateAttributeInput = {
  name: string;
  label: string;
  type: AttributeType;
  options?: string[];
  defaultValue?: string;
  isMandatory?: boolean;
  isVisible?: boolean;
  order?: number;
};

export type UpdateAttributeInput = {
  label?: string;
  type?: AttributeType;
  options?: string[];
  defaultValue?: string | null;
  isMandatory?: boolean;
  isVisible?: boolean;
  order?: number;
};

function requireAdmin(user: RequestUser) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can manage ticket attributes");
  }
}

export async function createAttribute(
  input: CreateAttributeInput,
  user: RequestUser,
) {
  requireAdmin(user);

  // Validate options for select types
  if (
    (input.type === AttributeType.select ||
      input.type === AttributeType.multiselect) &&
    (!input.options || input.options.length === 0)
  ) {
    throw createError(
      400,
      "Options are required for select and multiselect types",
    );
  }

  // Check if attribute with same name exists
  const existing = await prisma.ticketAttribute.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw createError(409, "Attribute with this name already exists");
  }

  return prisma.ticketAttribute.create({
    data: {
      name: input.name,
      label: input.label,
      type: input.type,
      options: input.options ?? [],
      defaultValue: input.defaultValue ?? null,
      isMandatory: input.isMandatory ?? false,
      isVisible: input.isVisible ?? true,
      order: input.order ?? 0,
    },
  });
}

export async function listAttributes(user: RequestUser) {
  // All authenticated users can view attributes (to populate forms)
  // but visibility is controlled by isVisible field
  const where = user.role === Role.admin ? {} : { isVisible: true };

  return prisma.ticketAttribute.findMany({
    where,
    orderBy: { order: "asc" },
  });
}

export async function getAttribute(attributeId: string, user: RequestUser) {
  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  if (!attribute.isVisible && user.role !== Role.admin) {
    throw createError(403, "You are not allowed to view this attribute");
  }

  return attribute;
}

export async function updateAttribute(
  attributeId: string,
  updates: UpdateAttributeInput,
  user: RequestUser,
) {
  requireAdmin(user);

  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  // Validate options for select types
  const nextType = updates.type ?? attribute.type;
  if (
    (nextType === AttributeType.select ||
      nextType === AttributeType.multiselect) &&
    updates.options !== undefined &&
    updates.options.length === 0
  ) {
    throw createError(
      400,
      "Options cannot be empty for select and multiselect types",
    );
  }

  return prisma.ticketAttribute.update({
    where: { id: attributeId },
    data: {
      label: updates.label,
      type: updates.type,
      options: updates.options,
      defaultValue: updates.defaultValue === null ? null : updates.defaultValue,
      isMandatory: updates.isMandatory,
      isVisible: updates.isVisible,
      order: updates.order,
    },
  });
}

export async function deleteAttribute(attributeId: string, user: RequestUser) {
  requireAdmin(user);

  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  // Delete will cascade to attribute values
  await prisma.ticketAttribute.delete({
    where: { id: attributeId },
  });

  return { success: true };
}

export async function getTicketAttributes(ticketId: string) {
  return prisma.ticketAttributeValue.findMany({
    where: { ticketId },
    include: {
      attribute: true,
    },
  });
}

export async function setTicketAttributeValue(
  ticketId: string,
  attributeId: string,
  value: string,
) {
  // Validate attribute exists
  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  // Upsert the attribute value
  return prisma.ticketAttributeValue.upsert({
    where: {
      ticketId_attributeId: {
        ticketId,
        attributeId,
      },
    },
    create: {
      ticketId,
      attributeId,
      value,
    },
    update: {
      value,
    },
    include: {
      attribute: true,
    },
  });
}

export async function validateTicketAttributes(
  attributeValues: Record<string, string>,
) {
  const attributes = await prisma.ticketAttribute.findMany({
    where: { isVisible: true },
  });

  const errors: string[] = [];

  // Check all mandatory attributes are provided
  for (const attr of attributes) {
    if (attr.isMandatory) {
      const value = attributeValues[attr.id];
      if (!value || value.trim() === "") {
        errors.push(`${attr.label} is required`);
      }
    }
  }

  // Validate select options
  for (const attr of attributes) {
    const value = attributeValues[attr.id];
    if (value) {
      if (attr.type === AttributeType.select) {
        if (!attr.options.includes(value)) {
          errors.push(`Invalid value for ${attr.label}`);
        }
      } else if (attr.type === AttributeType.multiselect) {
        const values = value.split(",");
        for (const v of values) {
          if (!attr.options.includes(v.trim())) {
            errors.push(`Invalid value for ${attr.label}`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw createError(400, errors.join(", "));
  }
}
