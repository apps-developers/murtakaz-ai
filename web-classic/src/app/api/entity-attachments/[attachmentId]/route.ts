import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEntityAccess } from "@/lib/permissions";
import { readFile } from "fs/promises";
import path from "path";

type AttachmentType = "FILE" | "URL";

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

export async function GET(request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !session.user.orgId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { attachmentId } = await context.params;

  const rows = await prisma.$queryRaw<EntityAttachmentRow[]>`
    SELECT id, entity_id, type, name, url, mime_type, size_bytes, storage_path, uploaded_by, created_at
    FROM entity_attachments
    WHERE id = ${attachmentId}
    LIMIT 1
  `;
  const row = rows[0] ?? null;

  if (!row) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const entity = await prisma.entity.findFirst({
    where: { id: row.entity_id, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });

  if (!entity) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN";
  if (!isAdmin) {
    const access = await getEntityAccess(session.user.id, entity.id, session.user.orgId);
    if (!access.canRead) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
  }

  if (row.type === "URL") {
    if (!row.url) return NextResponse.json({ error: "notFound" }, { status: 404 });
    return NextResponse.redirect(row.url);
  }

  if (!row.storage_path) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const fullPath = path.join(process.cwd(), row.storage_path);

  let buf: Buffer;
  try {
    buf = await readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", row.mime_type || "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`);

  const body = new Uint8Array(buf);
  return new Response(body, { status: 200, headers });
}
