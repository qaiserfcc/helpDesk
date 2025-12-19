import createError from "http-errors";
import { Prisma, AttributeType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type AttributeWithValues = Prisma.TicketAttributeGetPayload<{
  include: { values: true };
}>;

type CreateAttributeInput = {
  name: string;
  label: string;
  type: AttributeType;
  mandatory?: boolean;
  visible?: boolean;
  options?: Record<string, unknown> | null;
  defaultValue?: string | null;
  order?: number;
  active?: boolean;
};

type UpdateAttributeInput = {
  label?: string;
  type?: AttributeType;
  mandatory?: boolean;
  visible?: boolean;
  options?: Record<string, unknown> | null;
  defaultValue?: string | null;
  order?: number;
  active?: boolean;
};

export async function listAttributes(activeOnly = false) {
  const attributes = await prisma.ticketAttribute.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return attributes;
}

export async function getAttribute(attributeId: string) {
  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  return attribute;
}

export async function createAttribute(input: CreateAttributeInput) {
  // Check for duplicate name
  const existing = await prisma.ticketAttribute.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw createError(409, "Attribute with this name already exists");
  }

  // Validate options for select types
  if (
    (input.type === AttributeType.select ||
      input.type === AttributeType.multiselect) &&
    !input.options
  ) {
    throw createError(
      400,
      "Options are required for select and multiselect attributes",
    );
  }

  const attribute = await prisma.ticketAttribute.create({
    data: {
      name: input.name,
      label: input.label,
      type: input.type,
      mandatory: input.mandatory ?? false,
      visible: input.visible ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: (input.options as any) ?? undefined,
      defaultValue: input.defaultValue ?? null,
      order: input.order ?? 0,
      active: input.active ?? true,
    },
  });

  return attribute;
}

export async function updateAttribute(
  attributeId: string,
  input: UpdateAttributeInput,
) {
  // Check if attribute exists
  const existing = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!existing) {
    throw createError(404, "Attribute not found");
  }

  // Validate options for select types if type is being updated
  const newType = input.type ?? existing.type;
  if (
    (newType === AttributeType.select ||
      newType === AttributeType.multiselect) &&
    input.options === null
  ) {
    throw createError(
      400,
      "Options cannot be null for select and multiselect attributes",
    );
  }

  const attribute = await prisma.ticketAttribute.update({
    where: { id: attributeId },
    data: {
      label: input.label,
      type: input.type,
      mandatory: input.mandatory,
      visible: input.visible,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: (input.options as any) ?? undefined,
      defaultValue: input.defaultValue ?? undefined,
      order: input.order,
      active: input.active,
    },
  });

  return attribute;
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  // Check if attribute exists
  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
    include: {
      values: { select: { id: true } },
    },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  // Check if attribute is in use
  if (attribute.values.length > 0) {
    throw createError(
      400,
      "Cannot delete attribute that has values. Set it to inactive instead.",
    );
  }

  await prisma.ticketAttribute.delete({
    where: { id: attributeId },
  });
}

// Ticket attribute value operations
export async function getTicketAttributeValues(ticketId: string) {
  const values = await prisma.ticketAttributeValue.findMany({
    where: { ticketId },
    include: {
      attribute: true,
    },
  });

  return values;
}

export async function setTicketAttributeValue(
  ticketId: string,
  attributeId: string,
  value: string,
) {
  // Verify ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  // Verify attribute exists and is active
  const attribute = await prisma.ticketAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw createError(404, "Attribute not found");
  }

  if (!attribute.active) {
    throw createError(400, "Cannot set value for inactive attribute");
  }

  // Upsert the value
  const attributeValue = await prisma.ticketAttributeValue.upsert({
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

  return attributeValue;
}

export async function deleteTicketAttributeValue(
  ticketId: string,
  attributeId: string,
): Promise<void> {
  const existing = await prisma.ticketAttributeValue.findUnique({
    where: {
      ticketId_attributeId: {
        ticketId,
        attributeId,
      },
    },
  });

  if (!existing) {
    throw createError(404, "Attribute value not found");
  }

  await prisma.ticketAttributeValue.delete({
    where: {
      ticketId_attributeId: {
        ticketId,
        attributeId,
      },
    },
  });
}

export async function validateTicketAttributes(
  ticketId: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Get all mandatory attributes
  const mandatoryAttributes = await prisma.ticketAttribute.findMany({
    where: {
      mandatory: true,
      active: true,
    },
  });

  // Get ticket attribute values
  const ticketValues = await prisma.ticketAttributeValue.findMany({
    where: { ticketId },
    select: { attributeId: true },
  });

  const valueAttributeIds = new Set(ticketValues.map((v) => v.attributeId));

  // Check for missing mandatory attributes
  for (const attr of mandatoryAttributes) {
    if (!valueAttributeIds.has(attr.id)) {
      errors.push(`Missing mandatory attribute: ${attr.label}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
