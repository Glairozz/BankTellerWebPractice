import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";

// Enriches the Express Request with our authenticated user context.
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
