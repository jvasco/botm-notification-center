import {pool} from "../database";
import {RowDataPacket, ResultSetHeader} from "mysql2";
import {createNotificationDeliveries} from "./notificationDeliveryService";

export type NotificationEventType = 
| "SHIPPED"
| "ENROLLED"
| "AUDIOBOOK_AVAILABLE"

interface EventDefinitionRow extends RowDataPacket {
    id: number;
    delay_days: number | null;
}

export async function processNotificationEvent(
    eventType: NotificationEventType,
    accountId: number
): Promise<number> {
    const [definitions] = await pool.execute<EventDefinitionRow[]>(
        `
        SELECT id, delay_days FROM notification_definitions WHERE type = 'EVENT' 
        AND event_type = ?
        AND is_active = 1
        AND removed_at IS NULL
        `,
        [eventType]
    );
    let totalCreatedCount = 0;

    for(const definition of definitions) {
        const delayDays = definition.delay_days ?? 0;
        if (delayDays > 0) {
            const idempotencyKey = `${definition.id}:${accountId}:${Date.now()}`;
            const [result] = await pool.execute<ResultSetHeader>(
                `
                INSERT INTO notification_deliveries (
                    notification_definition_id,
                    account_id,
                    idempotency_key,
                    scheduled_at
                    ) VALUES (?, ?, ?, NOW() + INTERVAL ? DAY)
                `,
                [definition.id, accountId, idempotencyKey, delayDays]
            );
            totalCreatedCount += result.affectedRows;
        } else {
            totalCreatedCount += await createNotificationDeliveries(definition.id, [accountId]);
        }
    
    }
    return totalCreatedCount;
}

export async function processScheduledNotifications(): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `
    UPDATE notification_deliveries
    SET delivered_at = NOW()
    WHERE delivered_at IS NULL
      AND scheduled_at <= NOW()
    `
  );

  return result.affectedRows;
}