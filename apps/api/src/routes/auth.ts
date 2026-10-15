import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppError } from "../errors.js";
import { parseBody } from "../http/validation.js";
import { requireFrontendOrigin } from "../http/cors.js";
import {
  cookieOptions,
  createSession,
  destroySession,
  resolveSession,
  sessionCookie,
} from "../auth/sessions.js";
import { type AuthContext } from "../auth/guards.js";
import { rateLimit } from "../auth/rate-limit.js";

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

const registration = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password is too long"),
});
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password is too long"),
});

export type { AuthContext as AuthOptions };

export function authRouter(context: AuthContext) {
  const router = Router();
  const limit = rateLimit();

  router.post("/register", limit, async (req, res, next) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      const input = parseBody(registration, req.body);
      try {
        const user = await context.prisma.user.create({ data: {
          name: input.name,
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 12),
        }, select: publicUser });
        await createSession(context, user.id, res);
        res.status(201).json({ user });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
        }
        throw error;
      }
    } catch (error) { next(error); }
  });

  router.post("/login", limit, async (req, res, next) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      const input = parseBody(credentials, req.body);
      const user = await context.prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
      }
      await createSession(context, user.id, res);
      res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
    } catch (error) { next(error); }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const user = await resolveSession(context, req);
      if (!user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
      const profile = await context.prisma.user.findUnique({ where: { id: user.id }, select: publicUser });
      res.json({ user: profile });
    } catch (error) { next(error); }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      await destroySession(context, req);
      res.clearCookie(sessionCookie, cookieOptions(context));
      res.json({ status: "ok" });
    } catch (error) { next(error); }
  });

  return router;
}
