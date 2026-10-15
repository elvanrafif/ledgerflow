import { createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";

export const sessionCookie = "ledgerflow.sid";
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;

// The session cookie is scoped to the whole origin ("/"), not just /api/v1.
// The Next.js frontend reads this cookie in Server Components via next/headers,
// and a cookie scoped to /api/v1 is invisible to app routes like /dashboard, so
// those server-side fetches could never forward the session. HttpOnly + SameSite
// + Secure (in production) provide the safety; the path does not.
export const cookiePath = "/";

export type RequestUser = { id: string; name: string; email: string };

/** Everything a session/cookie operation needs from the app context. */
export type SessionContext = {
  prisma: PrismaClient;
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

export function cookieOptions(context: SessionContext) {
  const isProduction = (context.nodeEnv ?? process.env.NODE_ENV) === "production";
  // Same-origin deployments keep the stricter Lax default. Cross-site
  // deployments (web and API served from different origins, e.g. app.example.com
  // -> api.example.com) must send the cookie on cross-site requests or the
  // session never reaches the API; that requires SameSite=None, which browsers
  // only accept together with Secure. Opt in with COOKIE_CROSS_SITE=true.
  const crossSite = process.env.COOKIE_CROSS_SITE === "true";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: crossSite ? ("none" as const) : ("lax" as const),
    path: cookiePath,
  };
}

export function setSessionCookie(res: Response, token: string, context: SessionContext) {
  res.cookie(sessionCookie, token, { ...cookieOptions(context), maxAge: sessionLifetime });
}

export async function createSession(context: SessionContext, userId: string, res: Response) {
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

export async function resolveSession(context: SessionContext, req: Request): Promise<RequestUser | null> {
  const token = cookieToken(req);
  if (!token) return null;
  const session = await context.prisma.session.findUnique({
    where: { id: sessionId(token, context.sessionSecret) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function destroySession(context: SessionContext, req: Request) {
  const token = cookieToken(req);
  if (token) await context.prisma.session.deleteMany({ where: { id: sessionId(token, context.sessionSecret) } });
  return token;
}
