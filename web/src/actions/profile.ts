"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/server-action-auth";

async function requireProfileOrgMember() {
  return requireOrgMember({
    unauthorizedError: "Unauthorized",
    missingOrgError: "Unauthorized: Missing organization scope",
  });
}

export async function getMyProfile() {
  const session = await requireProfileOrgMember();

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      orgId: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      image: true,
      createdAt: true,
      org: { select: { id: true, name: true, domain: true } },
      manager: { select: { id: true, name: true, email: true, title: true, role: true } },
    },
  });

  if (!user) return null;

  return {
    user,
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
    },
  };
}
