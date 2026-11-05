import {pool} from "../database";
import {RowDataPacket, ResultSetHeader} from "mysql2";
import {createNotificationDeliveries} from "./notificationDeliveryService";

export type NotificationEventType = 
| "SHIPPED"
| "ENROLLED"
| "AUDIOBOOK_AVAILABLE"

interface EventDefinitionRow extends RowDataPacket {
    id: number;
}

export async function processNotificationEvent(
    eventType: NotificationEventType,
    accountId: number
): Promise<number> {
    const [definitions] = await pool.execute<EventDefinitionRow[]>(
        `
        SELECT id FROM notification_definitions WHERE type = 'EVENT' 
        AND event_type = ?
        AND is_active = 1
        AND removed_at IS NULL
        AND (delay_days IS NULL OR delay_days = 0)
        `,
        [eventType]
    );
    let totalCreatedCount = 0;

    for(const definition of definitions) {
        totalCreatedCount += await createNotificationDeliveries(definition.id, [accountId]);
    }
    return totalCreatedCount;
}