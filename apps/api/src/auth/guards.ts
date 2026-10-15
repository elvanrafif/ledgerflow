import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";
import { requireFrontendOrigin } from "../http/cors.js";
import { type RequestUser, resolveSession, type SessionContext } from "./sessions.js";

/** Everything the guards need: a session context plus the expected frontend origin. */
export type AuthContext = SessionContext & { frontendOrigin: string };

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
