import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    sendError(
      res,
      422,
      'VALIDATION_ERROR',
      'Request validation failed',
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
    return;
  }

  // Prisma-level unique constraint violation
  if ((err as any).code === 'P2002') {
    const target = (err as any).meta?.target || 'field';
    sendError(res, 409, 'CONFLICT', `Duplicate value for ${target}`);
    return;
  }

  // Prisma record not found
  if ((err as any).code === 'P2025') {
    sendError(res, 404, 'NOT_FOUND', 'Record not found');
    return;
  }

  // Known operational errors
  if ((err as any).statusCode) {
    sendError(res, (err as any).statusCode, (err as any).code || 'ERROR', err.message);
    return;
  }

  // Unknown errors — log and hide details in production
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

/**
 * Create an operational error with a status code.
 */
export function createError(
  statusCode: number,
  code: string,
  message: string
): Error & { statusCode: number; code: string } {
  const err = new Error(message) as Error & { statusCode: number; code: string };
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
