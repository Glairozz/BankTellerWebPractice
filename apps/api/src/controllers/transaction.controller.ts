import type { Request, Response } from "express";
import { transactionLimiter } from "../middleware/rateLimit";
import {
  deposit,
  withdraw,
  transfer,
  adjustBalance,
  approveTransaction,
} from "../services/transaction.service";
import {
  approveTransactionSchema,
  depositSchema,
  transferSchema,
  withdrawSchema,
  adjustBalanceSchema,
} from "../validation/schemas";
import { parseBody, ok, created } from "../lib/http";
import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";

function auditMeta(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const transactionController = {
  async deposit(req: Request, res: Response) {
    const input = parseBody(depositSchema, req.body);
    const result = await deposit(input.accountNumber, input.amount, {
      ...auditMeta(req),
      performedBy: { id: req.authUser!.id },
      description: input.description,
      idempotencyKey: input.idempotencyKey,
    });
    created(res, result);
  },

  async withdraw(req: Request, res: Response) {
    const input = parseBody(withdrawSchema, req.body);
    const result = await withdraw(input.accountNumber, input.amount, {
      ...auditMeta(req),
      performedBy: { id: req.authUser!.id },
      description: input.description,
      idempotencyKey: input.idempotencyKey,
    });
    created(res, result);
  },

  async transfer(req: Request, res: Response) {
    const input = parseBody(transferSchema, req.body);
    const result = await transfer(
      {
        sourceAccountNumber: input.sourceAccountNumber,
        destinationAccountNumber: input.destinationAccountNumber,
        amount: input.amount,
        description: input.description,
        idempotencyKey: input.idempotencyKey,
      },
      {
        ...auditMeta(req),
        // A CUSTOMER can only transfer from their own account; tellers may assist any.
        initiatedBy: { id: req.authUser!.id },
        performedBy: { id: req.authUser!.id },
        role: req.authUser!.role,
      },
    );
    created(res, result);
  },

  async adjust(req: Request, res: Response) {
    const input = parseBody(adjustBalanceSchema, req.body);
    const result = await adjustBalance(input.accountNumber, input.delta, input.reason, {
      ...auditMeta(req),
      performedBy: { id: req.authUser!.id, role: req.authUser!.role },
      idempotencyKey: input.idempotencyKey,
    });
    created(res, result);
  },

  async approve(req: Request, res: Response) {
    const { action, comments } = parseBody(approveTransactionSchema, req.body);
    const result = await approveTransaction(
      req.params.approvalId ?? "",
      action,
      req.authUser!.id,
      comments,
    );
    ok(res, result);
  },

  async listPendingApprovals(_req: Request, res: Response) {
    const approvals = await prisma.transactionApproval.findMany({
      where: { status: "PENDING" },
      include: {
        transaction: {
          include: {
            sourceAccount: true,
            destinationAccount: true,
            initiatedBy: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    ok(res, approvals);
  },

  async history(req: Request, res: Response) {
    const accountId = req.query.accountId as string | undefined;
    if (!accountId) {
      const user = await prisma.user.findUnique({
        where: { id: req.authUser!.id },
        include: { accounts: { select: { id: true } } },
      });
      if (!user) throw new NotFoundError("User not found");
      const ids = user.accounts.map((a) => a.id);
      const txns = await prisma.transaction.findMany({
        where: { OR: [{ sourceAccountId: { in: ids } }, { destinationAccountId: { in: ids } }] },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          sourceAccount: { select: { accountNumber: true } },
          destinationAccount: { select: { accountNumber: true } },
        },
      });
      return ok(res, txns);
    }

    const txns = await prisma.transaction.findMany({
      where: {
        OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sourceAccount: { select: { accountNumber: true } },
        destinationAccount: { select: { accountNumber: true } },
      },
    });
    ok(res, txns);
  },

  // Attach rate limiter to money-movement endpoints.
  rateLimit: transactionLimiter,
};
