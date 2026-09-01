import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { UnauthorizedError } from "./errors";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  jti: string; // token id (for server-side revocation)
}

const secret: jwt.Secret = env.JWT_SECRET;

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "securebank",
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, secret, { issuer: "securebank" });
    if (typeof decoded === "string") throw new Error("invalid token");
    return decoded as unknown as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}

// Server-side validation: ensure the token jti is still valid (not revoked).
export async function isTokenRevoked(jti: string): Promise<boolean> {
  const record = await prisma.accessToken.findUnique({ where: { jti } });
  if (!record) return true;
  return record.revokedAt !== null || record.expiresAt.getTime() < Date.now();
}

export async function persistToken(jti: string, userId: string, expiresAt: Date): Promise<void> {
  await prisma.accessToken.upsert({
    where: { jti },
    update: {},
    create: { jti, userId, expiresAt },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.accessToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
