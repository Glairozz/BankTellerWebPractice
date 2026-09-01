import { Router } from "express";
import { transactionController } from "../controllers/transaction.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// All money movement is authenticated.
router.post(
  "/deposit",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  transactionController.rateLimit,
  asyncHandler(transactionController.deposit),
);
router.post(
  "/withdraw",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  transactionController.rateLimit,
  asyncHandler(transactionController.withdraw),
);
router.post(
  "/transfer",
  requireAuth,
  requireRole("CUSTOMER", "TELLER", "ADMIN"),
  transactionController.rateLimit,
  asyncHandler(transactionController.transfer),
);
router.post(
  "/adjust",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  transactionController.rateLimit,
  asyncHandler(transactionController.adjust),
);
router.get(
  "/history",
  requireAuth,
  asyncHandler(transactionController.history),
);

// Approvals
router.get(
  "/approvals/pending",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  asyncHandler(transactionController.listPendingApprovals),
);
router.post(
  "/approvals/:approvalId/decide",
  requireAuth,
  requireRole("ADMIN", "TELLER"),
  asyncHandler(transactionController.approve),
);

export default router;
