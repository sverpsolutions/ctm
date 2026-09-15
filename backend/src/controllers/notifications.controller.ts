import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { page = '1', limit = '20', unreadOnly } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereSql = `UserID = @userId`;
    if (unreadOnly === 'true') {
      whereSql += ` AND IsRead = 0`;
    }

    const countResult = await executeQuery<{ Total: number }>(
      `SELECT COUNT(*) AS Total FROM dbo.Notifications WHERE ${whereSql}`,
      { userId }
    );
    const total = countResult.recordset[0]?.Total || 0;

    const unreadResult = await executeQuery<{ UnreadCount: number }>(
      `SELECT COUNT(*) AS UnreadCount FROM dbo.Notifications WHERE UserID = @userId AND IsRead = 0`,
      { userId }
    );
    const unreadCount = unreadResult.recordset[0]?.UnreadCount || 0;

    const notifs = await executeQuery(
      `SELECT * FROM dbo.Notifications 
       WHERE ${whereSql}
       ORDER BY CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`,
      { userId, offset, limitNum }
    );

    res.json({
      success: true,
      data: notifs.recordset,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    await executeQuery(
      `UPDATE dbo.Notifications SET IsRead = 1, ReadAt = SYSUTCDATETIME() 
       WHERE NotificationID = @notifId AND UserID = @userId`,
      { notifId, userId }
    );

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    await executeQuery(
      `UPDATE dbo.Notifications SET IsRead = 1, ReadAt = SYSUTCDATETIME() 
       WHERE UserID = @userId AND IsRead = 0`,
      { userId }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}
