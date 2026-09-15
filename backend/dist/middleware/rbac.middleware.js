"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.requirePlatformAdmin = requirePlatformAdmin;
/**
 * Ensures user has at least one of the specified roles
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
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
function requirePermission(permissionCode) {
    return (req, res, next) => {
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
function requirePlatformAdmin() {
    return (req, res, next) => {
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
