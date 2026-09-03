import { UserRole } from '@prisma/client';

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  facultyId?: string;
}

export interface JwtPayload {
  sub: string;     // user id
  email: string;
  role: UserRole;
  facultyId?: string;
  iat: number;
  exp: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
