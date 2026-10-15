import bcrypt from "bcryptjs";
import type { Response } from "express";
import { AppError } from "../errors.js";
import { createSession, type SessionContext } from "./sessions.js";
import type { PublicUser, UserRepository } from "./user-repository.js";

const BCRYPT_COST = 12;

/**
 * Account business rules: registration, credential checking, and profile
 * lookup. Depends on the repository and on session creation — not on Express
 * request/response except for issuing the session cookie on success.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly context: SessionContext,
  ) {}

  async register(input: { name: string; email: string; password: string }, res: Response): Promise<PublicUser> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.users.create(input.name, input.email, passwordHash);
    await createSession(this.context, user.id, res);
    return user;
  }

  async login(input: { email: string; password: string }, res: Response): Promise<PublicUser> {
    const user = await this.users.findByEmail(input.email);
    // One generic message for both "no such user" and "wrong password", so the
    // response does not reveal whether an email is registered.
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }
    await createSession(this.context, user.id, res);
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  async profile(userId: string): Promise<PublicUser> {
    const profile = await this.users.findPublicById(userId);
    if (!profile) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
    return profile;
  }
}
