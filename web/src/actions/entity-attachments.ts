"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEntityAccess, canEditEntityValues } from "@/lib/permissions";
import { requireOrgMember } from "@/lib/server-action-auth";
import { unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type AttachmentType = "FILE" | "URL";

export type EntityAttachment = {
  id: string;
  entityId: string;
  type: AttachmentType;
  name: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

type EntityAttachmentRow = {
  id: string;
  entity_id: string;
  type: AttachmentType;
  name: string;
  url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  uploaded_by: string | null;
  created_at: Date;
};

function mapRow(row: EntityAttachmentRow): EntityAttachment {
  return {
    id: String(row.id),
    entityId: String(row.entity_id),
    type: row.type,
    name: String(row.name),
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: typeof row.size_bytes === "number" ? row.size_bytes : row.size_bytes === null ? null : Number(row.size_bytes ?? 0),
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
}

const uuidSchema = z.string().uuid();

export async function getEntityAttachments(input: { entityId: string }): Promise<EntityAttachment[]> {
  const session = await requireOrgMember();
  const parsed = z.object({ entityId: uuidSchema }).safeParse(input);
  if (!parsed.success) return [];

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!entity) return [];

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  if (!isAdmin) {
    const access = await getEntityAccess(session.user.id, entity.id, session.user.orgId);
    if (!access.canRead) return [];
  }

  const rows = await prisma.$queryRaw<EntityAttachmentRow[]>`
    SELECT id, entity_id, type, name, url, mime_type, size_bytes, storage_path, uploaded_by, created_at
    FROM entity_attachments
    WHERE entity_id = ${entity.id}
    ORDER BY created_at DESC
  `;

  return rows.map(mapRow);
}

const addEntityAttachmentUrlSchema = z.object({
  entityId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2000),
});

export async function addEntityAttachmentUrl(input: z.infer<typeof addEntityAttachmentUrlSchema>) {
  const session = await requireOrgMember();
  const parsed = addEntityAttachmentUrlSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "validationFailed" };

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!entity) return { success: false as const, error: "notFound" };

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  if (!isAdmin) {
    const canEdit = await canEditEntityValues(session.user.id, entity.id, session.user.orgId);
    if (!canEdit) return { success: false as const, error: "unauthorized" };
  }

  const id = randomUUID();

  await prisma.$queryRaw`
    INSERT INTO entity_attachments (
      id, entity_id, type, name, url, mime_type, size_bytes, storage_path, uploaded_by, created_at
    ) VALUES (
      ${id}, ${entity.id}, 'URL', ${parsed.data.name}, ${parsed.data.url}, NULL, NULL, NULL, ${session.user.id}, NOW()
    )
  `;

  return { success: true as const, id };
}

const deleteEntityAttachmentSchema = z.object({ attachmentId: uuidSchema });

export async function deleteEntityAttachment(input: z.infer<typeof deleteEntityAttachmentSchema>) {
  const session = await requireOrgMember();
  const parsed = deleteEntityAttachmentSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "validationFailed" };

  const rows = await prisma.$queryRaw<EntityAttachmentRow[]>`
    SELECT id, entity_id, type, name, url, mime_type, size_bytes, storage_path, uploaded_by, created_at
    FROM entity_attachments
    WHERE id = ${parsed.data.attachmentId}
    LIMIT 1
  `;
  const row = rows[0] ?? null;
  if (!row) return { success: false as const, error: "notFound" };

  const entity = await prisma.entity.findFirst({
    where: { id: row.entity_id, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!entity) return { success: false as const, error: "notFound" };

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  if (!isAdmin) {
    const canEdit = await canEditEntityValues(session.user.id, entity.id, session.user.orgId);
    if (!canEdit) return { success: false as const, error: "unauthorized" };
  }

  await prisma.$queryRaw`
    DELETE FROM entity_attachments
    WHERE id = ${parsed.data.attachmentId}
  `;

  if (row.storage_path) {
    const fullPath = path.join(process.cwd(), row.storage_path);
    try {
      await unlink(fullPath);
    } catch {
      // Ignore missing file
    }
  }

  return { success: true as const };
}
