import rateLimit from "express-rate-limit";

// Rate limiting protects sensitive routes (auth, money movement) from
// brute-force and abuse. In production the store should be Redis-backed.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 requests (login/register) per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts, please try again later" },
});

export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // max 30 money operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many transactions, slow down" },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Rate limit exceeded" },
});
