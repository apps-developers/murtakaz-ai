"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server-action-auth";

export async function getMyOrganizationEntityTypes() {
  const session = await requireSession({ unauthorizedError: "Unauthorized" });

  if (!session.user.orgId) {
    return [];
  }

  const rows = await prisma.orgEntityType.findMany({
    where: {
      orgId: session.user.orgId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      nameAr: true,
      sortOrder: true,
    },
  });

  return rows.map((r) => ({
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    nameAr: r.nameAr ? String(r.nameAr) : null,
    sortOrder: Number(r.sortOrder ?? 0),
  }));
}

export async function getFirstEntityTypeCode() {
  const session = await requireSession({ unauthorizedError: "Unauthorized" });

  if (!session.user.orgId) {
    return null;
  }

  const rows = await prisma.orgEntityType.findMany({
    where: {
      orgId: session.user.orgId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      code: true,
    },
    take: 1,
  });

  return rows.length > 0 ? String(rows[0].code) : null;
}
