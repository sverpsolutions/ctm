"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const db_1 = require("../config/db");
async function sendNotification(options) {
    try {
        const channel = options.channel || 'In-App';
        // 1. Check Idempotency Key to prevent duplicate notification dispatch
        if (options.idempotencyKey) {
            const existing = await (0, db_1.executeQuery)(`SELECT TOP 1 LogID FROM dbo.NotificationLog WHERE IdempotencyKey = @key`, { key: options.idempotencyKey });
            if (existing.recordset.length > 0) {
                // Notification already sent for this event today/cycle
                return false;
            }
        }
        // 2. Insert In-App Notification
        await (0, db_1.executeQuery)(`INSERT INTO dbo.Notifications (
        UserID, Title, Message, Type, ReferenceType, ReferenceID, IsRead, CreatedAt
      ) VALUES (
        @userId, @title, @message, @type, @refType, @refId, 0, SYSUTCDATETIME()
      )`, {
            userId: options.userId,
            title: options.title,
            message: options.message,
            type: options.type,
            refType: options.referenceType || null,
            refId: options.referenceId || null,
        });
        // 3. Record in Notification Log for Idempotency
        if (options.idempotencyKey) {
            await (0, db_1.executeQuery)(`INSERT INTO dbo.NotificationLog (
          IdempotencyKey, NotificationType, RecipientUserID, Channel, SentAt, Status
        ) VALUES (
          @key, @type, @userId, @channel, SYSUTCDATETIME(), N'Sent'
        )`, {
                key: options.idempotencyKey,
                type: options.type,
                userId: options.userId,
                channel: channel,
            });
        }
        // 4. Multi-channel dispatch stubs (Email / WhatsApp / Telegram)
        if (channel === 'Email' || channel === 'All') {
            // Stub ready for nodemailer / SendGrid
            // console.log(`[Email Notification Stub] To User #${options.userId}: ${options.title}`);
        }
        if (channel === 'WhatsApp' || channel === 'All') {
            // Stub ready for WhatsApp Cloud API
            // console.log(`[WhatsApp Notification Stub] To User #${options.userId}: ${options.title}`);
        }
        if (channel === 'Telegram' || channel === 'All') {
            // Stub ready for Telegram Bot API
            // console.log(`[Telegram Notification Stub] To User #${options.userId}: ${options.title}`);
        }
        return true;
    }
    catch (err) {
        console.error('[Notification Dispatch Error]:', err.message);
        return false;
    }
}
