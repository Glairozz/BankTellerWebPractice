import { Prisma } from "@prisma/client";
import type { Account, Prisma as PrismaNS } from "@prisma/client";
import { TransactionStatus, TransactionType } from "@prisma/client";

// Business rules / thresholds.
export const HIGH_VALUE_THRESHOLD = 10_000; // USD-equivalent
export const MAX_TRANSFER_SELF_DELTA = 0;   // reserved

export const MIN_DEPOSIT = 1;
export const MIN_WITHDRAWAL = 1;
export const MIN_TRANSFER = 1;

export type TxClient = PrismaNS.TransactionClient;
