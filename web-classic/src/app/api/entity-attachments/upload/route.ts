import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditEntityValues } from "@/lib/permissions";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 20 * 1024 * 1024;

function sanitizeFilename(name: string) {
  const base = String(name ?? "").trim() || "file";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !session.user.orgId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const entityId = String(form.get("entityId") ?? "");
  const file = form.get("file");

  if (!entityId) {
    return NextResponse.json({ error: "entityIdRequired" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "fileRequired" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "fileTooLarge" }, { status: 400 });
  }

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });

  if (!entity) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN";
  if (!isAdmin) {
    const canEdit = await canEditEntityValues(session.user.id, entity.id, session.user.orgId);
    if (!canEdit) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
  }

  const originalName = sanitizeFilename(file.name);
  const attachmentId = randomUUID();
  const ext = path.extname(originalName).slice(0, 20);
  const safeBase = path.basename(originalName, ext);
  const storedName = `${attachmentId}-${safeBase}${ext}`;

  const relativeDir = path.join("uploads", "entity-attachments", entity.id);
  const relativePath = path.join(relativeDir, storedName);
  const fullDir = path.join(process.cwd(), relativeDir);
  const fullPath = path.join(process.cwd(), relativePath);

  await mkdir(fullDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  await prisma.$queryRaw`
    INSERT INTO entity_attachments (
      id, entity_id, type, name, url, mime_type, size_bytes, storage_path, uploaded_by, created_at
    ) VALUES (
      ${attachmentId}, ${entity.id}, 'FILE', ${originalName}, NULL, ${file.type || null}, ${file.size}, ${relativePath}, ${session.user.id}, NOW()
    )
  `;

  return NextResponse.json({ success: true, id: attachmentId });
}
