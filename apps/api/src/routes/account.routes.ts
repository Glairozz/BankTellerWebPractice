import { Router } from "express";
import { accountController } from "../controllers/account.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// Teller / admin search & management
router.get(
  "/search",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  asyncHandler(accountController.search),
);
router.get(
  "/:accountNumber",
  requireAuth,
  asyncHandler(accountController.findByNumber),
);
router.post(
  "/",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  asyncHandler(accountController.create),
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("TELLER", "ADMIN"),
  asyncHandler(accountController.setStatus),
);
router.get(
  "/:accountId/statement",
  requireAuth,
  asyncHandler(accountController.statement),
);

export default router;
