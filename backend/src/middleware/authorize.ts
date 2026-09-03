import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/response';

/**
 * Role-based authorization middleware factory.
 * Returns middleware that allows only the specified roles.
 *
 * Usage:
 *   router.post('/faculty', authenticate, authorize('ADMIN'), createFaculty)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        403,
        'FORBIDDEN',
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
      return;
    }

    next();
  };
}

/**
 * Convenience middleware: ADMIN only.
 */
export const adminOnly = authorize('ADMIN');

/**
 * Convenience middleware: ADMIN or FACULTY.
 */
export const anyRole = authorize('ADMIN', 'FACULTY');
