import type { Response } from "express";
import type { z } from "zod";
import { ValidationError } from "./errors";

// Standardized API response envelope.
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function noContent(res: Response): void {
  res.status(204).send();
}

// Parse a Zod schema and throw a normalized ValidationError on failure.
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid request payload", result.error.flatten());
  }
  return result.data;
}
