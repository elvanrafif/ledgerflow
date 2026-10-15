import { Router } from "express";
import { z } from "zod";
import { parseBody } from "../http/validation.js";
import { requireFrontendOrigin } from "../http/cors.js";
import { cookieOptions, destroySession, resolveSession, sessionCookie } from "../auth/sessions.js";
import { type AuthContext } from "../auth/guards.js";
import { rateLimit } from "../auth/rate-limit.js";
import { AuthService } from "../auth/service.js";
import { UserRepository } from "../auth/user-repository.js";
import { AppError } from "../errors.js";

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
  const service = new AuthService(new UserRepository(context.prisma), context);
  const limit = rateLimit();

  router.post("/register", limit, async (req, res, next) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      const input = parseBody(registration, req.body);
      const user = await service.register(input, res);
      res.status(201).json({ user });
    } catch (error) { next(error); }
  });

  router.post("/login", limit, async (req, res, next) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      const input = parseBody(credentials, req.body);
      res.json({ user: await service.login(input, res) });
    } catch (error) { next(error); }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const session = await resolveSession(context, req);
      if (!session) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
      res.json({ user: await service.profile(session.id) });
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
