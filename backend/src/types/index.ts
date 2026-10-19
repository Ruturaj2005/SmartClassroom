import { UserRole } from '@prisma/client';

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      device?: AuthenticatedDevice;
      tap?: EdgeTapContext;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  facultyId?: string;
}

export interface AuthenticatedDevice {
  id: string;
  deviceCode: string;
  classroomId: string;
  classroomName: string;
}

/** Faculty identity established by an RFID tap on a classroom device */
export interface EdgeTapContext {
  facultyId: string;
  userId: string;
  rfidCardId: string;
  deviceId: string;
}

export interface EdgeTapTokenPayload {
  typ: 'edge-tap';
  sub: string;      // faculty id
  userId: string;
  rfidCardId: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export interface JwtPayload {
  sub: string;     // user id
  email: string;
  role: UserRole;
  facultyId?: string;
  typ?: string;
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
