import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "../errors.js";

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

/**
 * Data access for accounts. Owns the user queries and translates the unique
 * email constraint (P2002) into the domain error the API exposes, so callers
 * never see Prisma error codes.
 */
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(name: string, email: string, passwordHash: string): Promise<PublicUser> {
    try {
      return await this.prisma.user.create({ data: { name, email, passwordHash }, select: publicUser });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
      }
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: publicUser });
  }
}
