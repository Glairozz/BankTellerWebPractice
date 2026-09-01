import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { AppError } from "../lib/errors";

// Assign a request id and log each incoming request.
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${req.requestId}] ${req.method} ${req.originalUrl} → ${_res.statusCode} (${duration}ms)`,
    );
  });
  next();
}

/**
 * Central error handler. Never leaks stack traces to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
    return;
  }

  // Prisma known errors
  const code = (err as { code?: string })?.code;
  if (code === "P2002") {
    res.status(409).json({ success: false, error: "A record with that value already exists" });
    return;
  }
  if (code === "P2025") {
    res.status(404).json({ success: false, error: "Record not found" });
    return;
  }

  console.error(`[API:${req.requestId}] Unhandled error:`, err);
  res.status(500).json({ success: false, error: "Internal server error" });
}

// Wrap async route handlers so thrown await errors reach the handler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
