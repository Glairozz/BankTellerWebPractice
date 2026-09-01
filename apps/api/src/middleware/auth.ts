import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, isTokenRevoked, type JwtPayload } from "../lib/token";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Pull the httpOnly access token cookie.
const TOKEN_COOKIE = "access_token";

/**
 * requireAuth - validates the JWT in the httpOnly cookie and attaches the
 * user context to the request. It also checks server-side revocation.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) throw new UnauthorizedError("Not authenticated");

    const payload: JwtPayload = verifyAccessToken(token);

    if (await isTokenRevoked(payload.jti)) {
      throw new UnauthorizedError("Session has been revoked");
    }

    // Ensure the user still exists and is active.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Account disabled");
    }

    req.authUser = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole - RBAC guard. Must run AFTER requireAuth.
 */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return next(new UnauthorizedError("Not authenticated"));
    }
    if (!roles.includes(req.authUser.role)) {
      return next(new ForbiddenError("Insufficient role permissions"));
    }
    next();
  };
