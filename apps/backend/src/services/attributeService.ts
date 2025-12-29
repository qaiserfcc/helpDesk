import createError from "http-errors";
import { prisma } from "../lib/prisma.js";
import { AttributeType, Role, Prisma } from "@prisma/client";

type RequestUser = Express.AuthenticatedUser;

export type AttributeInput = {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
  visibleTo?: Role[];
  active?: boolean;
  order?: number;
};

export type AttributeUpdateInput = Partial<AttributeInput>;

function canSeeAttribute(attr: { visibleTo: Role[] }, role: Role) {
  // Empty visibleTo means visible to all roles
  return !attr.visibleTo.length || attr.visibleTo.includes(role);
}

export async function listAttributes(user: RequestUser) {
  const attrs = await prisma.attribute.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return attrs.filter((a) => canSeeAttribute(a, user.role));
}

export async function listAllAttributes(user: RequestUser) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can list all attributes");
  }
  return prisma.attribute.findMany({ orderBy: { order: "asc" } });
}

export async function createAttribute(
  input: AttributeInput,
  user: RequestUser,
) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can create attributes");
  }

  if (!input.key?.trim()) {
    throw createError(400, "Attribute key is required");
  }

  if (!input.label?.trim()) {
    throw createError(400, "Attribute label is required");
  }

  if (
    input.type === AttributeType.select ||
    input.type === AttributeType.multiselect
  ) {
    if (!input.options || !input.options.length) {
      throw createError(400, "Select/multiselect requires non-empty options");
    }
  }

  try {
    const attr = await prisma.attribute.create({
      data: {
        key: input.key.trim(),
        label: input.label.trim(),
        type: input.type,
        options: input.options ?? [],
        required: Boolean(input.required),
        visibleTo: input.visibleTo ?? [],
        active: input.active ?? true,
        order: input.order ?? 0,
      },
    });
    return attr;
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      throw createError(409, "Attribute key must be unique");
    }
    throw err;
  }
}

export async function updateAttribute(
  attributeId: string,
  updates: AttributeUpdateInput,
  user: RequestUser,
) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can update attributes");
  }

  const existing = await prisma.attribute.findUnique({
    where: { id: attributeId },
  });
  if (!existing) {
    throw createError(404, "Attribute not found");
  }

  if (
    updates.type === AttributeType.select ||
    updates.type === AttributeType.multiselect
  ) {
    if (updates.options && !updates.options.length) {
      throw createError(400, "Select/multiselect requires non-empty options");
    }
  }

  try {
    const attr = await prisma.attribute.update({
      where: { id: attributeId },
      data: {
        key: updates.key?.trim() ?? existing.key,
        label: updates.label?.trim() ?? existing.label,
        type: updates.type ?? existing.type,
        options: updates.options ?? existing.options,
        required: updates.required ?? existing.required,
        visibleTo: updates.visibleTo ?? existing.visibleTo,
        active: updates.active ?? existing.active,
        order: updates.order ?? existing.order,
      },
    });
    return attr;
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      throw createError(409, "Attribute key must be unique");
    }
    throw err;
  }
}

export async function deleteAttribute(attributeId: string, user: RequestUser) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can delete attributes");
  }

  const existing = await prisma.attribute.findUnique({
    where: { id: attributeId },
  });
  if (!existing) {
    throw createError(404, "Attribute not found");
  }

  // Cascades will remove TicketAttributeValue entries
  await prisma.attribute.delete({ where: { id: attributeId } });
  return existing;
}

export type ResolvedAttributeValue = {
  attributeId: string;
  key: string;
  value: unknown;
};

function validateSingleValue(
  meta: { type: AttributeType; options: string[] },
  raw: unknown,
) {
  switch (meta.type) {
    case AttributeType.text: {
      if (typeof raw !== "string" || !raw.trim()) {
        throw createError(400, "Text attribute requires a non-empty string");
      }
      return raw.trim();
    }
    case AttributeType.number: {
      const num = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(num)) {
        throw createError(400, "Number attribute requires a numeric value");
      }
      return num;
    }
    case AttributeType.date: {
      const d = typeof raw === "string" ? new Date(raw) : (raw as Date);
      const time = d instanceof Date ? d.getTime() : NaN;
      if (!Number.isFinite(time)) {
        throw createError(400, "Date attribute requires an ISO date string");
      }
      return new Date(time).toISOString();
    }
    case AttributeType.select: {
      if (typeof raw !== "string" || !meta.options.includes(raw)) {
        throw createError(400, "Select attribute must match one of options");
      }
      return raw;
    }
    case AttributeType.multiselect: {
      const arr = Array.isArray(raw) ? raw : [];
      const valid = arr.every(
        (v) => typeof v === "string" && meta.options.includes(v),
      );
      if (!valid) {
        throw createError(400, "Multiselect must be array of allowed options");
      }
      return arr;
    }
  }
}

export async function resolveAttributesForTicket(
  attributes: Record<string, unknown> | undefined,
  user: RequestUser,
) {
  if (!attributes || !Object.keys(attributes).length)
    return [] as ResolvedAttributeValue[];

  const keys = Object.keys(attributes);
  const metas = await prisma.attribute.findMany({
    where: { key: { in: keys }, active: true },
  });
  const byKey = new Map(metas.map((m) => [m.key, m]));

  const resolved: ResolvedAttributeValue[] = [];
  for (const key of keys) {
    const meta = byKey.get(key);
    if (!meta) {
      throw createError(400, `Unknown attribute key: ${key}`);
    }
    if (!canSeeAttribute(meta, user.role)) {
      throw createError(403, `You cannot set attribute: ${key}`);
    }
    const raw = attributes[key];
    const value = validateSingleValue(
      { type: meta.type, options: meta.options },
      raw,
    );
    resolved.push({ attributeId: meta.id, key, value });
  }
  return resolved;
}

export async function assertRequiredAttributesPresent(
  user: RequestUser,
  providedKeys: string[],
) {
  // Required attributes visible to role must be present during ticket creation.
  const required = await prisma.attribute.findMany({
    where: { required: true, active: true },
  });
  const missing = required
    .filter((m) => canSeeAttribute(m, user.role))
    .filter((m) => !providedKeys.includes(m.key));
  if (missing.length) {
    const names = missing.map((m) => m.label || m.key).join(", ");
    throw createError(400, `Missing required attributes: ${names}`);
  }
}
