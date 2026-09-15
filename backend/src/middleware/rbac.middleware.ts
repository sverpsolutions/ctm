import { Request, Response, NextFunction } from 'express';

/**
 * Ensures user has at least one of the specified roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.isPlatformAdmin || req.user.roleName === 'Super Admin') {
      return next();
    }

    if (allowedRoles.includes(req.user.roleName)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: `Forbidden: Required role [${allowedRoles.join(', ')}]. Current role [${req.user.roleName}].`,
    });
  };
}

/**
 * Ensures user has a specific permission code or is Super Admin
 */
export function requirePermission(permissionCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.isPlatformAdmin || req.user.roleName === 'Super Admin') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: `Forbidden: Insufficient permission. Required [${permissionCode}].`,
    });
  };
}

export function requirePlatformAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.user.isPlatformAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Platform administrator access required.',
      });
      return;
    }

    next();
  };
}
