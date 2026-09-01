import type { Request, Response } from "express";
import { AccountStatus } from "@prisma/client";
import {
  createAccount,
  getAccountByNumber,
  getAccountStatement,
  searchAccounts,
  setAccountStatus,
} from "../services/account.service";
import {
  accountSearchSchema,
  createAccountSchema,
} from "../validation/schemas";
import { parseBody, ok, created } from "../lib/http";
import { ValidationError } from "../lib/errors";

export const accountController = {
  async search(req: Request, res: Response) {
    const { q } = parseBody(accountSearchSchema, { q: req.query.q ?? "" });
    const results = await searchAccounts(q);
    ok(res, results);
  },

  async findByNumber(req: Request, res: Response) {
    const account = await getAccountByNumber(req.params.accountNumber ?? "");
    ok(res, account);
  },

  async create(req: Request, res: Response) {
    const input = parseBody(createAccountSchema, req.body);
    const ownerId = req.body.ownerId as string | undefined;

    if (!ownerId) {
      throw new ValidationError("ownerId is required");
    }

    const account = await createAccount(req.authUser!.id, ownerId, input.accountType, input.currency, {
      actorId: req.authUser!.id,
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
    created(res, account);
  },

  // Freeze / unfreeze
  async setStatus(req: Request, res: Response) {
    const { status } = req.body as { status?: AccountStatus };
    if (!status || !["ACTIVE", "FROZEN", "CLOSED"].includes(status)) {
      throw new ValidationError("Valid status required (ACTIVE, FROZEN, CLOSED)");
    }
    const account = await setAccountStatus(
      req.authUser!.id,
      req.params.id ?? "",
      status,
      {
        actorId: req.authUser!.id,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      },
    );
    ok(res, account);
  },

  async statement(req: Request, res: Response) {
    const { accountId } = req.params;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const statement = await getAccountStatement(accountId, from, to);
    ok(res, statement);
  },
};
