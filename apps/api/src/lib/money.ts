import { randomBytes } from "crypto";

export function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export function fromCents(cents: bigint): number {
  return Number(cents) / 100;
}

/**
 * Convert a Prisma Decimal balance to a serializable number.
 * We represent money as a number of major units with 2dp precision
 * for the API boundary; the DB stores 4dp decimals.
 */
export function moneyToNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

// Deterministic account number: SB-XXXX-XXXX-XXXX
export function generateAccountNumber(): string {
  const seg = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `SB-${seg()}-${seg()}-${seg()}`;
}

// Human-friendly customer id: CUST-XXXXXX
export function generateCustomerId(): string {
  return `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
}

// Human-friendly transaction reference: TXN-yyyyMMdd-######
export function generateTransactionReference(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${ymd}-${rand}`;
}

// Cryptographic idempotency key is provided by the client.
export function randomIdempotencyKey(): string {
  return randomBytes(16).toString("hex");
}
