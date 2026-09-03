import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { JwtPayload } from '../types';
import { sendError } from '../utils/response';

/**
 * Authentication middleware.
 * Validates JWT Bearer token and attaches user to request.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication token required');
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      facultyId: payload.facultyId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token');
    } else {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication failed');
    }
  }
}
