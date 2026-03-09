"use server";

import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/server-action-auth";
import { NotificationType } from "@/generated/prisma-client";
import { resolveRoleRank } from "@/lib/roles";

export async function getMyNotifications() {
  const session = await requireOrgMember();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      message: true,
      messageAr: true,
      entityId: true,
      entityValueId: true,
      createdAt: true,
    },
  });
  return notifications.map((n) => ({
    ...n,
    type: String(n.type),
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getMyNotificationCount() {
  const session = await requireOrgMember();
  return prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });
}

export async function markNotificationsRead(ids?: string[]) {
  const session = await requireOrgMember();
  const now = new Date();
  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { readAt: now },
  });
  return { success: true as const };
}

/**
 * Dispatch APPROVAL_PENDING notifications to all users in the org
 * whose role rank >= the org's required approval level.
 * Called internally after a value is submitted.
 */
export async function dispatchApprovalPendingNotification({
  orgId,
  entityId,
  entityValueId,
  entityTitle,
  entityTitleAr,
  submitterName,
}: {
  orgId: string;
  entityId: string;
  entityValueId: string;
  entityTitle: string;
  entityTitleAr: string | null;
  submitterName: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });
  if (!org) return;

  const requiredRank = resolveRoleRank(String(org.kpiApprovalLevel));

  const approvers = await prisma.user.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, role: true },
  });

  const eligibleApprovers = approvers.filter(
    (u) => resolveRoleRank(String(u.role)) >= requiredRank,
  );

  if (eligibleApprovers.length === 0) return;

  await prisma.notification.createMany({
    data: eligibleApprovers.map((u) => ({
      userId: u.id,
      orgId,
      type: NotificationType.APPROVAL_PENDING,
      entityId,
      entityValueId,
      message: `A KPI value for "${entityTitle}" was submitted by ${submitterName} and is pending your approval.`,
      messageAr: entityTitleAr
        ? `قيمة مؤشر أداء "${entityTitleAr}" مُرسلة من ${submitterName} وبانتظار اعتمادك.`
        : `قيمة مؤشر الأداء مُرسلة من ${submitterName} وبانتظار اعتمادك.`,
    })),
    skipDuplicates: true,
  });
}

/**
 * Dispatch VALUE_APPROVED or VALUE_REJECTED to the submitter.
 * Called internally after approve/reject actions.
 */
export async function dispatchApprovalDecisionNotification({
  orgId,
  recipientUserId,
  entityId,
  entityValueId,
  entityTitle,
  entityTitleAr,
  approved,
}: {
  orgId: string;
  recipientUserId: string;
  entityId: string;
  entityValueId: string;
  entityTitle: string;
  entityTitleAr: string | null;
  approved: boolean;
}) {
  const type = approved ? NotificationType.VALUE_APPROVED : NotificationType.VALUE_REJECTED;

  const message = approved
    ? `Your KPI value for "${entityTitle}" was approved.`
    : `Your KPI value for "${entityTitle}" was rejected. Please review the note and resubmit.`;

  const messageAr = approved
    ? `تم اعتماد قيمة مؤشر الأداء "${entityTitleAr ?? entityTitle}".`
    : `تم رفض قيمة مؤشر الأداء "${entityTitleAr ?? entityTitle}". يرجى مراجعة الملاحظة وإعادة الإرسال.`;

  await prisma.notification.create({
    data: {
      userId: recipientUserId,
      orgId,
      type,
      entityId,
      entityValueId,
      message,
      messageAr,
    },
  });
}
