import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Creates Express middleware that validates the request body against a Zod schema.
 * On success, replaces req.body with the parsed (typed) data.
 * On failure, passes the ZodError to the error handler.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}
