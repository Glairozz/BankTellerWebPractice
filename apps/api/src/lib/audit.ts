import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface AuditContext {
  actorId?: string | null;
  targetUserId?: string | null;
  transactionId?: string | null;
  accountId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry extends AuditContext {
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
}

/**
 * AuditService - writes every sensitive operation to the immutable
 * audit_logs table for compliance forensics.
 */
export const audit = {
  async write(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          targetUserId: entry.targetUserId ?? null,
          transactionId: entry.transactionId ?? null,
          accountId: entry.accountId ?? null,
          metadata: entry.metadata ?? undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // Auditing must never break the primary operation; log and continue.
      console.error("[audit] failed to write log entry:", err);
    }
  },
};
