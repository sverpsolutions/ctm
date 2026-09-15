import { executeQuery } from '../config/db';
import { Request } from 'express';

export async function logAudit(options: {
  userId?: number | null;
  username?: string | null;
  action: string;
  entityName: string;
  entityId?: number | null;
  oldValues?: any;
  newValues?: any;
  req?: Request;
}): Promise<void> {
  try {
    const ipAddress = options.req ? (options.req.ip || options.req.socket?.remoteAddress || '127.0.0.1') : 'system';
    const userAgent = options.req ? options.req.headers['user-agent'] || 'internal' : 'internal';

    const userId = options.userId ?? (options.req?.user?.userId || null);
    const username = options.username ?? (options.req?.user?.username || 'system');

    const tenantId = options.req?.user?.tenantId || null;

    await executeQuery(
      `INSERT INTO dbo.AuditLogs (
        UserID, Username, Action, EntityName, EntityID, OldValues, NewValues, IPAddress, UserAgent, TenantID, CreatedAt
      ) VALUES (
        @userId, @username, @action, @entityName, @entityId, @oldValues, @newValues, @ipAddress, @userAgent, @tenantId, SYSUTCDATETIME()
      )`,
      {
        userId,
        username,
        action: options.action,
        entityName: options.entityName,
        entityId: options.entityId || null,
        oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
        newValues: options.newValues ? JSON.stringify(options.newValues) : null,
        ipAddress: String(ipAddress).substring(0, 50),
        userAgent: String(userAgent).substring(0, 255),
        tenantId,
      }
    );
  } catch (err: any) {
    console.error('[Audit Log Failure]:', err.message);
  }
}
