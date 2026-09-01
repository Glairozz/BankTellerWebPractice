import { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import argon2 from "argon2";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../lib/errors";
import { audit } from "../lib/audit";
import { signAccessToken, persistToken, revokeAllUserTokens } from "../lib/token";
import { generateCustomerId, generateAccountNumber } from "../lib/money";
import type { LoginInput, RegisterInput } from "../validation/schemas";

// Register always opens a default CHECKING account for the new customer.
export async function register(input: RegisterInput, ip?: string, userAgent?: string) {
  const { fullName, email, password } = input;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: Role.CUSTOMER,
          customerId: generateCustomerId(),
          accounts: {
            create: {
              accountNumber: generateAccountNumber(),
              accountType: "CHECKING",
              currency: "USD",
              balance: new Prisma.Decimal(0),
            },
          },
        },
        include: { accounts: true },
      });

      await tx.auditLog.create({
        data: {
          action: "USER_CREATED",
          targetUserId: created.id,
          actorId: created.id,
          ipAddress: ip ?? null,
          userAgent: userAgent ?? null,
          metadata: { email: normalizedEmail },
        },
      });

      return created;
    });

    return user;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("An account with this email already exists");
    }
    throw err;
  }
}

export async function login(input: LoginInput, ip?: string, userAgent?: string) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await audit.write({
      action: "LOGIN_FAILURE",
      ipAddress: ip,
      userAgent,
      metadata: { email },
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.isActive) {
    await audit.write({
      action: "LOGIN_FAILURE",
      actorId: user.id,
      targetUserId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "account_disabled" },
    });
    throw new UnauthorizedError("This account has been disabled");
  }

  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) {
    await audit.write({
      action: "LOGIN_FAILURE",
      actorId: user.id,
      targetUserId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "wrong_password" },
    });
    // Record to login_attempts for lockout forensics.
    await prisma.loginAttempt.create({
      data: { email, userId: user.id, success: false, ipAddress: ip, userAgent },
    });
    throw new UnauthorizedError("Invalid email or password");
  }

  // Successful login → issue JWT.
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await persistToken(jti, user.id, expiresAt);
  const token = signAccessToken({ sub: user.id, role: user.role, jti });

  await prisma.loginAttempt.create({
    data: { email, userId: user.id, success: true, ipAddress: ip, userAgent },
  });
  await audit.write({
    action: "LOGIN_SUCCESS",
    actorId: user.id,
    targetUserId: user.id,
    ipAddress: ip,
    userAgent,
  });

  return { token, user: safeUser(user) };
}

export async function logout(userId: string, ip?: string, userAgent?: string) {
  await revokeAllUserTokens(userId);
  await audit.write({
    action: "LOGOUT",
    actorId: userId,
    targetUserId: userId,
    ipAddress: ip,
    userAgent,
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true },
  });
  if (!user) throw new NotFoundError("User not found");
  return safeUser(user);
}

type UserWithRelations = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  customerId: string | null;
  createdAt: Date;
  passwordHash: string;
  accounts?: unknown[];
};

// Never leak the password hash.
function safeUser(user: UserWithRelations) {
  const { passwordHash: _removed, ...rest } = user;
  void _removed;
  return rest;
}
