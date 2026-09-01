import { z } from "zod";
import { AccountType, AccountStatus, Currency, TransactionType } from "@prisma/client";

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z.string().email("A valid email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------

export const createAccountSchema = z.object({
  accountType: z.nativeEnum(AccountType),
  currency: z.nativeEnum(Currency).default(Currency.USD),
});

export const accountSearchSchema = z.object({
  q: z.string().min(1).max(64),
});

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

const money = z
  .number({ invalid_type_error: "Amount must be a number" })
  .positive("Amount must be positive")
  .max(1_000_000_000, "Amount exceeds platform limit")
  .transform((n) => Math.round(n * 100) / 100);

export const depositSchema = z.object({
  accountNumber: z.string().min(1),
  amount: money,
  description: z.string().max(255).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const withdrawSchema = z.object({
  accountNumber: z.string().min(1),
  amount: money,
  description: z.string().max(255).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const transferSchema = z.object({
  sourceAccountNumber: z.string().min(1),
  destinationAccountNumber: z.string().min(1),
  amount: money,
  description: z.string().max(255).optional(),
  // High-value transfers (> HIGH_VALUE_THRESHOLD) require an approval workflow.
  idempotencyKey: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// APPROVALS
// ---------------------------------------------------------------------------

export const approveTransactionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comments: z.string().max(500).optional(),
});

export const adjustBalanceSchema = z.object({
  accountNumber: z.string().min(1),
  delta: z.number().finite(),
  reason: z.string().min(3).max(500),
  idempotencyKey: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
