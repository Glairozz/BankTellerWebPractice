import { Prisma } from "@prisma/client";
import type { Account, Prisma as PrismaNS, Role } from "@prisma/client";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { audit } from "../lib/audit";
import {
  ConflictError,
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from "../lib/errors";
import { generateTransactionReference } from "../lib/money";
import type { TxClient } from "../config/business";
import { HIGH_VALUE_THRESHOLD } from "../config/business";

export interface AuditMeta {
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Lock an account row with SELECT ... FOR UPDATE so concurrent transactions
 * serialize on the balance. Prisma does not expose FOR UPDATE natively, so we
 * use a raw query and then re-fetch the full row.
 */
async function lockAccount(tx: TxClient, accountNumber: string): Promise<Account> {
  const locked = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM accounts WHERE "accountNumber" = ${accountNumber} FOR UPDATE`;

  if (locked.length === 0) {
    throw new NotFoundError(`Account ${accountNumber} not found`);
  }

  const account = await tx.account.findUnique({ where: { id: locked[0].id } });
  if (!account) throw new NotFoundError(`Account ${accountNumber} not found`);
  return account;
}

function ensureActive(account: Account) {
  if (account.status !== "ACTIVE") {
    throw new ValidationError(`Account ${account.accountNumber} is ${account.status.toLowerCase()}`);
  }
}

function asCents(value: number): Prisma.Decimal {
  // Money amounts are pre-validated to 2dp; store at 4dp in DB.
  return new Prisma.Decimal(value.toFixed(4));
}

const toNumber = (d: { toNumber(): number }) => d.toNumber();

async function createTransactionRecord(
  tx: TxClient,
  input: {
    type: TransactionType;
    amount: Prisma.Decimal;
    currency: string;
    sourceAccountId?: string | null;
    destinationAccountId?: string | null;
    initiatedById?: string | null;
    performedById?: string | null;
    description?: string | null;
    status: TransactionStatus;
    idempotencyKey?: string | null;
    failureReason?: string | null;
  },
) {
  return tx.transaction.create({
    data: {
      reference: generateTransactionReference(),
      type: input.type,
      amount: input.amount,
      currency: input.currency as never,
      status: input.status,
      sourceAccountId: input.sourceAccountId ?? null,
      destinationAccountId: input.destinationAccountId ?? null,
      initiatedById: input.initiatedById ?? null,
      performedById: input.performedById ?? null,
      description: input.description ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      failureReason: input.failureReason ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// DEPOSIT
// ---------------------------------------------------------------------------

export async function deposit(
  accountNumber: string,
  amount: number,
  meta: AuditMeta & {
    performedBy: { id: string };
    description?: string;
    idempotencyKey?: string;
  },
) {
  return runAtomic(async (tx) => {
    if (meta.idempotencyKey) {
      await assertIdempotent(tx, meta.idempotencyKey);
    }

    const account = await lockAccount(tx, accountNumber);
    ensureActive(account);

    const newBalance = asCents(toNumber(account.balance)).add(asCents(amount));
    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balance: newBalance, version: { increment: 1 } },
    });

    const txn = await createTransactionRecord(tx, {
      type: TransactionType.DEPOSIT,
      amount: asCents(amount),
      currency: account.currency as string,
      destinationAccountId: account.id,
      performedById: meta.performedBy.id,
      description: meta.description,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: meta.idempotencyKey,
    });

    await tx.auditLog.create({
      data: {
        action: "DEPOSIT",
        actorId: meta.performedBy.id,
        accountId: account.id,
        transactionId: txn.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { amount, accountNumber },
      },
    });

    return { txn, account: updated, balance: toNumber(updated.balance) };
  });
}

// ---------------------------------------------------------------------------
// WITHDRAWAL
// ---------------------------------------------------------------------------

export async function withdraw(
  accountNumber: string,
  amount: number,
  meta: AuditMeta & {
    performedBy: { id: string };
    description?: string;
    idempotencyKey?: string;
  },
) {
  return runAtomic(async (tx) => {
    if (meta.idempotencyKey) {
      await assertIdempotent(tx, meta.idempotencyKey);
    }

    const account = await lockAccount(tx, accountNumber);
    ensureActive(account);

    const current = toNumber(account.balance);
    if (amount > current) {
      throw new InsufficientFundsError(
        `Insufficient funds: available ${current.toFixed(2)}`,
      );
    }

    const newBalance = asCents(current).minus(asCents(amount));
    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balance: newBalance, version: { increment: 1 } },
    });

    const txn = await createTransactionRecord(tx, {
      type: TransactionType.WITHDRAWAL,
      amount: asCents(amount),
      currency: account.currency as string,
      sourceAccountId: account.id,
      performedById: meta.performedBy.id,
      description: meta.description,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: meta.idempotencyKey,
    });

    await tx.auditLog.create({
      data: {
        action: "WITHDRAWAL",
        actorId: meta.performedBy.id,
        accountId: account.id,
        transactionId: txn.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { amount, accountNumber },
      },
    });

    return { txn, account: updated, balance: toNumber(updated.balance) };
  });
}

// ---------------------------------------------------------------------------
// TRANSFER (atomic; both accounts locked in deterministic order)
// ---------------------------------------------------------------------------

export async function transfer(
  input: {
    sourceAccountNumber: string;
    destinationAccountNumber: string;
    amount: number;
    description?: string;
    idempotencyKey?: string;
  },
  meta: AuditMeta & {
    initiatedBy?: { id: string } | null;
    performedBy?: { id: string } | null;
    role: Role;
  },
) {
  return runAtomic(async (tx) => {
    if (input.idempotencyKey) {
      await assertIdempotent(tx, input.idempotencyKey);
    }

    if (input.sourceAccountNumber === input.destinationAccountNumber) {
      throw new ValidationError("Source and destination accounts must differ");
    }

    // Lock both rows. Lock in a deterministic order (sorted) to avoid deadlocks.
    const accountNumbers = [input.sourceAccountNumber, input.destinationAccountNumber];
    const [src, dst] =
      accountNumbers[0] < accountNumbers[1]
        ? [
            await lockAccount(tx, input.sourceAccountNumber),
            await lockAccount(tx, input.destinationAccountNumber),
          ]
        : [
            await lockAccount(tx, input.destinationAccountNumber),
            await lockAccount(tx, input.sourceAccountNumber),
          ];

    const source = src.accountNumber === input.sourceAccountNumber ? src : dst;
    const destination = source.accountNumber === input.sourceAccountNumber ? dst : src;

    ensureActive(source);
    ensureActive(destination);

    if (source.currency !== destination.currency) {
      throw new ValidationError("Accounts must share the same currency to transfer");
    }

    const sourceBalance = toNumber(source.balance);
    if (input.amount > sourceBalance) {
      throw new InsufficientFundsError(
        `Insufficient funds: available ${sourceBalance.toFixed(2)}`,
      );
    }

    const sourceNew = asCents(sourceBalance).minus(asCents(input.amount));
    const destNew = asCents(toNumber(destination.balance)).add(asCents(input.amount));

    const isHighValue = input.amount >= HIGH_VALUE_THRESHOLD;

    // For high-value transfers, mark as PENDING + create approval instead of committing funds.
    if (isHighValue && meta.role !== "ADMIN") {
      const txn = await createTransactionRecord(tx, {
        type: TransactionType.TRANSFER,
        amount: asCents(input.amount),
        currency: source.currency as string,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        initiatedById: meta.initiatedBy?.id ?? null,
        performedById: meta.performedBy?.id ?? null,
        description: input.description,
        status: TransactionStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      });

      await tx.transactionApproval.create({
        data: {
          transactionId: txn.id,
          requestedAmount: asCents(input.amount),
          status: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "TRANSFER",
          actorId: meta.performedBy?.id ?? meta.initiatedBy?.id ?? null,
          targetUserId: meta.initiatedBy?.id ?? null,
          transactionId: txn.id,
          accountId: source.id,
          ipAddress: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
          metadata: { amount: input.amount, status: "PENDING_APPROVAL" },
        },
      });

      return { txn, status: "PENDING_APPROVAL" as const, highValue: true };
    }

    // Atomic dual-entry update within the serializable transaction.
    const updatedSource = await tx.account.update({
      where: { id: source.id },
      data: { balance: sourceNew, version: { increment: 1 } },
    });
    const updatedDest = await tx.account.update({
      where: { id: destination.id },
      data: { balance: destNew, version: { increment: 1 } },
    });

    const txn = await createTransactionRecord(tx, {
      type: TransactionType.TRANSFER,
      amount: asCents(input.amount),
      currency: source.currency as string,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      initiatedById: meta.initiatedBy?.id ?? null,
      performedById: meta.performedBy?.id ?? null,
      description: input.description,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: input.idempotencyKey,
    });

    await tx.auditLog.create({
      data: {
        action: "TRANSFER",
        actorId: meta.performedBy?.id ?? meta.initiatedBy?.id ?? null,
        targetUserId: meta.initiatedBy?.id ?? null,
        transactionId: txn.id,
        accountId: source.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { amount: input.amount, status: "COMPLETED" },
      },
    });

    return {
      txn,
      status: "COMPLETED" as const,
      highValue: false,
      sourceBalance: toNumber(updatedSource.balance),
      destinationBalance: toNumber(updatedDest.balance),
    };
  });
}

// ---------------------------------------------------------------------------
// BALANCE ADJUSTMENT (teller/admin, heavily audited)
// ---------------------------------------------------------------------------

export async function adjustBalance(
  accountNumber: string,
  delta: number,
  reason: string,
  meta: AuditMeta & {
    performedBy: { id: string; role: Role };
    idempotencyKey?: string;
  },
) {
  if (delta === 0) throw new ValidationError("Delta must be non-zero");

  return runAtomic(async (tx) => {
    if (meta.idempotencyKey) {
      await assertIdempotent(tx, meta.idempotencyKey);
    }

    const account = await lockAccount(tx, accountNumber);
    ensureActive(account);

    const current = toNumber(account.balance);
    const target = current + delta;
    if (target < 0) throw new InsufficientFundsError("Adjustment would overdraw the account");

    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balance: asCents(target), version: { increment: 1 } },
    });

    const txn = await createTransactionRecord(tx, {
      type: delta > 0 ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
      amount: asCents(Math.abs(delta)),
      currency: account.currency as string,
      destinationAccountId: delta > 0 ? account.id : null,
      sourceAccountId: delta < 0 ? account.id : null,
      performedById: meta.performedBy.id,
      description: `MANUAL ADJUSTMENT: ${reason}`,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: meta.idempotencyKey,
    });

    await tx.auditLog.create({
      data: {
        action: "BALANCE_ADJUSTMENT",
        actorId: meta.performedBy.id,
        accountId: account.id,
        transactionId: txn.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { delta, reason },
      },
    });

    return { txn, account: updated, balance: toNumber(updated.balance) };
  });
}

// ---------------------------------------------------------------------------
// APPROVAL (high-value transfer approval)
// ---------------------------------------------------------------------------

export async function approveTransaction(
  approvalId: string,
  decision: "APPROVE" | "REJECT",
  actUserId: string,
  comments?: string,
) {
  return runAtomic(async (tx) => {
    const approval = await tx.transactionApproval.findUnique({
      where: { id: approvalId },
      include: { transaction: true },
    });
    if (!approval) throw new NotFoundError("Approval not found");
    if (approval.status !== "PENDING") {
      throw new ConflictError("This request has already been reviewed");
    }

    const txn = approval.transaction;

    if (decision === "REJECT") {
      const updatedTxn = await tx.transaction.update({
        where: { id: txn.id },
        data: { status: TransactionStatus.CANCELLED, failureReason: comments ?? "Rejected" },
      });
      await tx.transactionApproval.update({
        where: { id: approvalId },
        data: { status: "REJECTED", approvedById: actUserId, reviewedAt: new Date(), comments },
      });
      await tx.auditLog.create({
        data: {
          action: "TRANSACTION_REJECTED",
          actorId: actUserId,
          transactionId: txn.id,
          metadata: { comments },
        },
      });
      return { status: "REJECTED" as const, txn: updatedTxn };
    }

    // APPROVE → validate funds once more and commit.
    const source = await lockAccount(tx, txn.sourceAccountId!);
    const destination = await lockAccount(tx, txn.destinationAccountId!);
    ensureActive(source);
    ensureActive(destination);

    const sourceBalance = toNumber(source.balance);
    const amount = toNumber(txn.amount);
    if (amount > sourceBalance) {
      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: TransactionStatus.FAILED, failureReason: "Insufficient funds at approval" },
      });
      await tx.transactionApproval.update({
        where: { id: approvalId },
        data: { status: "REJECTED", approvedById: actUserId, reviewedAt: new Date(), comments },
      });
      throw new InsufficientFundsError("Insufficient funds at time of approval");
    }

    const sourceNew = asCents(sourceBalance).minus(asCents(amount));
    const destNew = asCents(toNumber(destination.balance)).add(asCents(amount));

    await tx.account.update({
      where: { id: source.id },
      data: { balance: sourceNew, version: { increment: 1 } },
    });
    await tx.account.update({
      where: { id: destination.id },
      data: { balance: destNew, version: { increment: 1 } },
    });

    await tx.transaction.update({
      where: { id: txn.id },
      data: { status: TransactionStatus.COMPLETED },
    });
    await tx.transactionApproval.update({
      where: { id: approvalId },
      data: { status: "APPROVED", approvedById: actUserId, reviewedAt: new Date(), comments },
    });
    await tx.auditLog.create({
      data: {
        action: "TRANSACTION_APPROVED",
        actorId: actUserId,
        transactionId: txn.id,
        metadata: { comments },
      },
    });

    return { status: "APPROVED" as const, txn };
  });
}

// ---------------------------------------------------------------------------
// IDEMPOTENCY HANDLER
// ---------------------------------------------------------------------------

async function assertIdempotent(tx: TxClient, key: string) {
  const existing = await tx.transaction.findUnique({ where: { idempotencyKey: key } });
  if (existing) throw new ConflictError("Duplicate request: idempotency key already used");
}

// ---------------------------------------------------------------------------
// INTERACTIVE TRANSACTION WRAPPER
// ---------------------------------------------------------------------------

/**
 * runAtomic executes the callback inside a single `$transaction` interactive
 * transaction at the SERIALIZABLE isolation level → strong ACID guarantees,
 * and any failure rolls back all statements atomically.
 */
async function runAtomic<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export type { PrismaNS };
