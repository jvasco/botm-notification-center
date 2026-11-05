import { randomUUID } from 'crypto';
import { ResultSetHeader } from 'mysql2';
import {pool} from '../database';

export async function createNotificationDeliveries(
    notificationDefinitionId: number,
    accountIds: number[],
    
): Promise<number> {
    if (accountIds.length === 0) {
        return 0;
    }

    let createdCount = 0;
    for (const accountId of accountIds) {
        const minute = Math.floor(Date.now() / 60_000);
        const idempotencyKey = `${notificationDefinitionId}:${accountId}:${minute}`;
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO notification_deliveries (notification_definition_id, account_id, delivered_at, idempotency_key) VALUES (?, ?, NOW(), ?)',
            [notificationDefinitionId, accountId, idempotencyKey]
        );
        createdCount += result.affectedRows;
    }
    return createdCount;
}

export async function getAccountNotifications(accountId: number): Promise<any[]> {
    const [rows] = await pool.execute(
        `
        SELECT 
            del.id,
            del.account_id,
            del.delivered_at,
            del.clicked_at,
            def.icon,
            def.headline,
            def.subheadline,
            def.link
        FROM notification_deliveries del 
        JOIN notification_definitions def 
        ON del.notification_definition_id = def.id 
        WHERE del.account_id = ? 
        AND del.delivered_at >= NOW() - INTERVAL 1 MONTH
        ORDER BY del.delivered_at DESC
        `,
        [accountId]
    );
    return rows as any[];
}