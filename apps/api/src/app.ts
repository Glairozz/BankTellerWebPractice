import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { requestLogger, errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/account.routes";
import transactionRoutes from "./routes/transaction.routes";
import { prisma } from "./lib/prisma";

export const app = express();

app.set("trust proxy", 1);

// Security & body parsing
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

app.use(requestLogger);
app.use("/api", apiLimiter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
});

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Central error handler
app.use(errorHandler);

// Graceful shutdown of Prisma
export async function shutdown(reason: string) {
  console.log(`Shutting down (${reason})...`);
  await prisma.$disconnect();
  process.exit(0);
}
