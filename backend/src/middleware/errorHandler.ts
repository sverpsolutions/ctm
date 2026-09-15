import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Return clean, safe error message to client
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error occurred. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
