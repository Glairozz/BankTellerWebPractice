import type { Request, Response } from "express";
import { register, login, logout, getMe } from "../services/auth.service";
import { registerSchema, loginSchema } from "../validation/schemas";
import { parseBody, ok, created, noContent } from "../lib/http";

const TOKEN_COOKIE = "access_token";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  maxAge: 2 * 60 * 60 * 1000, // 2h
  path: "/",
});

function deriveIp(req: Request): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  let ip: string | undefined;
  try {
    ip = req.ip ?? undefined;
  } catch {
    ip = undefined;
  }
  return ip;
}

export const authController = {
  async register(req: Request, res: Response) {
    const input = parseBody(registerSchema, req.body);
    const user = await register(input, deriveIp(req), req.headers["user-agent"] ?? undefined);
    created(res, user);
  },

  async login(req: Request, res: Response) {
    const input = parseBody(loginSchema, req.body);
    const { token, user } = await login(
      input,
      deriveIp(req),
      req.headers["user-agent"] ?? undefined,
    );
    res.cookie(TOKEN_COOKIE, token, cookieOptions());
    ok(res, { user });
  },

  async logout(req: Request, res: Response) {
    if (req.authUser) {
      await logout(req.authUser.id, deriveIp(req), req.headers["user-agent"] ?? undefined);
    }
    res.clearCookie(TOKEN_COOKIE, { path: "/", httpOnly: true });
    noContent(res);
  },

  async me(req: Request, res: Response) {
    const user = await getMe(req.authUser!.id);
    ok(res, user);
  },
};
