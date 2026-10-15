import { createHmac, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "./errors.js";
import { requireFrontendOrigin } from "./http.js";

export const sessionCookie = "ledgerflow.sid";
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
// The session cookie is scoped to the whole origin ("/"), not just /api/v1.
// The Next.js frontend reads this cookie in Server Components via next/headers,
// and a cookie scoped to /api/v1 is invisible to app routes like /dashboard, so
// those server-side fetches could never forward the session. HttpOnly + SameSite
// + Secure (in production) provide the safety; the path does not.
export const cookiePath = "/";

export type RequestUser = { id: string; name: string; email: string };

export type AuthedRequest = Request & { user: RequestUser };

export type AuthContext = {
  prisma: PrismaClient;
  frontendOrigin: string;
  sessionSecret: string;
  nodeEnv?: string;
};

export function sessionId(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function cookieToken(req: Request) {
  return req.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
}

export function cookieOptions(context: AuthContext) {
  return {
    httpOnly: true,
    secure: (context.nodeEnv ?? process.env.NODE_ENV) === "production",
    sameSite: "lax" as const,
    path: cookiePath,
  };
}

export function setSessionCookie(res: Response, token: string, context: AuthContext) {
  res.cookie(sessionCookie, token, { ...cookieOptions(context), maxAge: sessionLifetime });
}

export async function createSession(context: AuthContext, userId: string, res: Response) {
  const token = randomBytes(32).toString("base64url");
  await context.prisma.session.create({
    data: {
      id: sessionId(token, context.sessionSecret),
      userId,
      expiresAt: new Date(Date.now() + sessionLifetime),
    },
  });
  setSessionCookie(res, token, context);
}

export async function resolveSession(context: AuthContext, req: Request): Promise<RequestUser | null> {
  const token = cookieToken(req);
  if (!token) return null;
  const session = await context.prisma.session.findUnique({
    where: { id: sessionId(token, context.sessionSecret) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export function requireAuth(context: AuthContext) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveSession(context, req);
      if (!user) {
        next(new AppError(401, "UNAUTHENTICATED", "Authentication is required"));
        return;
      }
      (res.locals.user as RequestUser) = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function currentUser(res: Response): RequestUser {
  const user = res.locals.user as RequestUser | undefined;
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
  return user;
}

export function protectState(req: Request, context: AuthContext) {
  requireFrontendOrigin(req, context.frontendOrigin);
}

// Every cookie-authenticated write must carry the frontend Origin, per PRD
// security requirements. Requests with no Origin are rejected here.
export function requireOrigin(context: AuthContext) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      requireFrontendOrigin(req, context.frontendOrigin);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function rateLimit(limit = 10, windowMs = 15 * 60 * 1000) {
  // shorthand: process-local limits do not coordinate across API instances; use a shared store when scaling beyond one.
  const attempts = new Map<string, { count: number; expiresAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expiresAt <= now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const current = attempts.get(key);
    if (current && current.count >= limit) {
      next(new AppError(429, "AUTH_RATE_LIMITED", "Too many authentication attempts; try again later"));
      return;
    }
    attempts.set(key, current ? { ...current, count: current.count + 1 } : { count: 1, expiresAt: now + windowMs });
    next();
  };
}
