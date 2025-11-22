import 'express';
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      name: string;
      role: Role;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
