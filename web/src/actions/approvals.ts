"use server";

import { z } from "zod";
import { KpiValueStatus } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";
import { canEditEntityValues, getSubordinateIds } from "@/lib/permissions";
import { resolveRoleRank } from "@/lib/roles";
import { getOrgKpiApprovalLevel, requireOrgMember } from "@/lib/server-action-auth";
import {
  dispatchApprovalPendingNotification,
  dispatchApprovalDecisionNotification,
} from "@/actions/notifications";

/**
 * Submit entity value for approval
 */
export async function submitEntityForApproval(input: { entityId: string; periodId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid() 
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Check if user can edit this entity
    const isAdmin = String(session.user.role) === "ADMIN";
    if (!isAdmin) {
      const canEdit = await canEditEntityValues(session.user.id, parsed.data.entityId, session.user.orgId);
      if (!canEdit) {
        return { success: false as const, error: "unauthorized" };
      }
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true, title: true, titleAr: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.DRAFT) {
      return { success: false as const, error: "periodNotDraft" };
    }

    // Get org approval level
    const orgApprovalLevel = await getOrgKpiApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Auto-approve if user role >= required approval level
    const canAutoApprove = userRoleRank >= requiredRoleRank;

    const now = new Date();

    if (canAutoApprove) {
      const res = await prisma.entityValue.updateMany({
        where: { id: parsed.data.periodId, entityId: parsed.data.entityId, status: KpiValueStatus.DRAFT },
        data: {
          status: KpiValueStatus.APPROVED,
          submittedBy: session.user.id,
          submittedAt: now,
          approvedBy: session.user.id,
          approvedAt: now,
          approvalType: "AUTO",
        },
      });

      if (res.count === 0) return { success: false as const, error: "periodNotDraft" };
      return { success: true as const, autoApproved: true };
    }

    const res = await prisma.entityValue.updateMany({
      where: { id: parsed.data.periodId, entityId: parsed.data.entityId, status: KpiValueStatus.DRAFT },
      data: {
        status: KpiValueStatus.SUBMITTED,
        submittedBy: session.user.id,
        submittedAt: now,
        approvalType: "MANUAL",
      },
    });

    if (res.count === 0) return { success: false as const, error: "periodNotDraft" };

    // Dispatch notification to approvers (fire-and-forget)
    void dispatchApprovalPendingNotification({
      orgId: session.user.orgId,
      entityId: entity.id,
      entityValueId: parsed.data.periodId,
      entityTitle: String(entity.title),
      entityTitleAr: entity.titleAr ? String(entity.titleAr) : null,
      submitterName: String(session.user.name ?? ""),
    }).catch((e) => console.warn("Failed to dispatch approval notification:", e));

    return { success: true as const, autoApproved: false };
  } catch (error: unknown) {
    console.error("Failed to submit for approval:", error);
    return { success: false as const, error: "failedToSubmit" };
  }
}

/**
 * Approve entity value (for users with approval authority)
 */
export async function approveEntityValue(input: { entityId: string; periodId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid() 
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Get org approval level
    const orgApprovalLevel = await getOrgKpiApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Check if user has approval authority
    if (userRoleRank < requiredRoleRank) {
      return { success: false as const, error: "insufficientApprovalAuthority" };
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    // Get the period
    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.SUBMITTED) {
      return { success: false as const, error: "periodNotSubmitted" };
    }

    // Verify entity belongs to user's org (fetch title for notification)
    const entityForNotif = await prisma.entity.findFirst({
      where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
      select: { id: true, title: true, titleAr: true },
    });

    const period2 = await prisma.entityValue.findFirst({
      where: { id: parsed.data.periodId, entityId: parsed.data.entityId },
      select: { id: true, status: true, submittedBy: true },
    });

    const res = await prisma.entityValue.updateMany({
      where: { id: parsed.data.periodId, entityId: parsed.data.entityId, status: KpiValueStatus.SUBMITTED },
      data: {
        status: KpiValueStatus.APPROVED,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    if (res.count === 0) return { success: false as const, error: "periodNotSubmitted" };

    // Notify submitter (fire-and-forget)
    if (entityForNotif && period2?.submittedBy) {
      void dispatchApprovalDecisionNotification({
        orgId: session.user.orgId,
        recipientUserId: period2.submittedBy,
        entityId: entityForNotif.id,
        entityValueId: parsed.data.periodId,
        entityTitle: String(entityForNotif.title),
        entityTitleAr: entityForNotif.titleAr ? String(entityForNotif.titleAr) : null,
        approved: true,
      }).catch((e) => console.warn("Failed to dispatch approval decision notification:", e));
    }

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to approve:", error);
    return { success: false as const, error: "failedToApprove" };
  }
}

/**
 * Reject entity value and return to draft
 */
export async function rejectEntityValue(input: { entityId: string; periodId: string; reason?: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid(),
    reason: z.string().optional(),
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Get org approval level
    const orgApprovalLevel = await getOrgKpiApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Check if user has approval authority
    if (userRoleRank < requiredRoleRank) {
      return { success: false as const, error: "insufficientApprovalAuthority" };
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true, note: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.SUBMITTED) {
      return { success: false as const, error: "periodNotSubmitted" };
    }

    // Reject and return to draft
    const rejectionNote = parsed.data.reason 
      ? `${period.note ? period.note + "\n\n" : ""}[REJECTED] ${parsed.data.reason}`
      : period.note;

    // Fetch entity title for notification
    const entityForNotif = await prisma.entity.findFirst({
      where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
      select: { id: true, title: true, titleAr: true },
    });

    const res = await prisma.entityValue.updateMany({
      where: { id: parsed.data.periodId, entityId: parsed.data.entityId, status: KpiValueStatus.SUBMITTED },
      data: {
        status: KpiValueStatus.DRAFT,
        note: rejectionNote,
        // Keep submitted info for audit trail
      },
    });

    if (res.count === 0) return { success: false as const, error: "periodNotSubmitted" };

    // Notify submitter (fire-and-forget)
    if (entityForNotif && period.status === KpiValueStatus.SUBMITTED) {
      const submittedByUserId = await prisma.entityValue.findFirst({
        where: { id: parsed.data.periodId },
        select: { submittedBy: true },
      });
      if (submittedByUserId?.submittedBy) {
        void dispatchApprovalDecisionNotification({
          orgId: session.user.orgId,
          recipientUserId: submittedByUserId.submittedBy,
          entityId: entityForNotif.id,
          entityValueId: parsed.data.periodId,
          entityTitle: String(entityForNotif.title),
          entityTitleAr: entityForNotif.titleAr ? String(entityForNotif.titleAr) : null,
          approved: false,
        }).catch((e) => console.warn("Failed to dispatch rejection notification:", e));
      }
    }

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to reject:", error);
    return { success: false as const, error: "failedToReject" };
  }
}

/**
 * Get entities with periods pending or approved for approval
 */
export async function getEntityApprovals(input?: { status?: "SUBMITTED" | "APPROVED" }) {
  const session = await requireOrgMember();
  const isAdmin = String(session.user.role) === "ADMIN";
  
  // Check if user has approval authority
  const orgApprovalLevel = await getOrgKpiApprovalLevel(session.user.orgId);
  
  const userRoleRank = resolveRoleRank(session.user.role as string);
  const requiredRoleRank = resolveRoleRank(orgApprovalLevel);
  const canApprove = userRoleRank >= requiredRoleRank;
  
  if (!canApprove) {
    throw new Error("unauthorized");
  }
  
  const relevantUserIds = isAdmin ? [] : [session.user.id, ...(await getSubordinateIds(session.user.id, session.user.orgId))];
  
  // Parse status filter
  const parsed = z
    .object({ status: z.enum(["SUBMITTED", "APPROVED"]).optional() })
    .optional()
    .safeParse(input);
  
  const statusFilter = parsed.success ? parsed.data?.status : undefined;
  
  const periods = await prisma.entityValue.findMany({
    where: {
      entity: {
        orgId: session.user.orgId,
        deletedAt: null,
        ...(isAdmin
          ? {}
          : {
              assignments: {
                some: {
                  userId: { in: relevantUserIds },
                },
              },
            }),
      },
      status: statusFilter
        ? (statusFilter as KpiValueStatus)
        : { in: ["SUBMITTED" as KpiValueStatus, "APPROVED" as KpiValueStatus] },
    },
    orderBy: [
      { submittedAt: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      id: true,
      entityId: true,
      createdAt: true,
      finalValue: true,
      calculatedValue: true,
      actualValue: true,
      status: true,
      note: true,
      submittedAt: true,
      approvedAt: true,
      submittedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      entity: {
        select: {
          id: true,
          title: true,
          titleAr: true,
          key: true,
          periodType: true,
          orgEntityType: {
            select: {
              code: true,
              name: true,
              nameAr: true,
            },
          },
        },
      },
    },
  });
  
  return periods;
}
