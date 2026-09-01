import { Prisma } from "@prisma/client";
import type { Account, AccountType, Currency } from "@prisma/client";
import { AccountStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { audit } from "../lib/audit";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors";
import { generateAccountNumber } from "../lib/money";

export interface AuditMeta {
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

// Search by account number OR customer id / user email. Service-layer only
// returns what the caller may see (status etc.).
export async function searchAccounts(query: string) {
  const q = query.trim().toLowerCase();

  const byAccountNumber = await prisma.account.findMany({
    where: { accountNumber: { contains: q, mode: "insensitive" } },
    include: { owner: { select: { id: true, fullName: true, email: true, customerId: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const byIdOrEmail = await prisma.user.findMany({
    where: {
      OR: [
        { customerId: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { accounts: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    byAccountNumber,
    byCustomer: byIdOrEmail,
  };
}

export async function getAccountByNumber(accountNumber: string) {
  const account = await prisma.account.findUnique({
    where: { accountNumber },
    include: { owner: { select: { id: true, fullName: true, email: true, customerId: true } } },
  });
  if (!account) throw new NotFoundError(`Account ${accountNumber} not found`);
  return account;
}

// Teller creates an account for an existing customer (by user id) or open
// for self. ACTIVE on creation.
export async function createAccount(
  actorId: string,
  ownerId: string,
  accountType: AccountType,
  currency: Currency,
  meta: AuditMeta,
) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new NotFoundError("Owner user not found");

  const accountNumber = generateAccountNumber();
  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        accountNumber,
        accountType,
        currency,
        balance: new Prisma.Decimal(0),
        ownerId,
      },
    });
    await tx.auditLog.create({
      data: {
        action: "ACCOUNT_CREATED",
        actorId,
        targetUserId: ownerId,
        accountId: created.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { accountType, currency, accountNumber },
      },
    });
    return created;
  });

  return account;
}

export async function setAccountStatus(
  actorId: string,
  accountId: string,
  status: AccountStatus,
  meta: AuditMeta,
) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError("Account not found");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.account.update({ where: { id: accountId }, data: { status } });
    if (status === AccountStatus.FROZEN) {
      await tx.auditLog.create({
        data: {
          action: "ACCOUNT_FROZEN",
          actorId,
          accountId,
          ipAddress: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
    } else if (status === AccountStatus.ACTIVE) {
      await tx.auditLog.create({
        data: {
          action: "ACCOUNT_UNFROZEN",
          actorId,
          accountId,
          ipAddress: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
    }
    return result;
  });

  return updated;
}

export async function getAccountStatement(accountId: string, from?: Date, to?: Date) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError("Account not found");

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }],
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      sourceAccount: { select: { accountNumber: true } },
      destinationAccount: { select: { accountNumber: true } },
      performedBy: { select: { fullName: true } },
    },
  });

  return { account, transactions };
}
