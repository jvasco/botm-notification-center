import { ResultSetHeader } from 'mysql2';
import {pool} from '../database';
import { randomUUID } from 'crypto';

export async function createNotificationDeliveries(
    notificationDefinitionId: number,
    accountIds: number[],
    idempotencyKeyGenerator?: (accountId: number) => string
    
): Promise<number> {
    if (accountIds.length === 0) {
        return 0;
    }

    let createdCount = 0;
    for (const accountId of accountIds) {
        const idempotencyKey = idempotencyKeyGenerator ? idempotencyKeyGenerator(accountId) : `${notificationDefinitionId}:${accountId}:${randomUUID()}`;
        try{
            const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO notification_deliveries (notification_definition_id, account_id, delivered_at, idempotency_key) VALUES (?, ?, NOW(), ?)',
            [notificationDefinitionId, accountId, idempotencyKey]
        );
        createdCount += result.affectedRows;
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            console.warn(`Duplicate entry for notification_definition_id: ${notificationDefinitionId}, account_id: ${accountId}, idempotency_key: ${idempotencyKey}. Skipping.`);
        } else {
            throw error;
        }
    }
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
        AND del.delivered_at >= DATE_FORMAT(
            CURRENT_DATE - INTERVAL 1 MONTH,
            '%Y-%m-01'
        )
            AND def.removed_at IS NULL
        ORDER BY del.delivered_at DESC
        `,
        [accountId]
    );
    return rows as any[];
}

export async function markNotificationAsClicked(notificationDeliveryId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE notification_deliveries SET clicked_at = NOW() WHERE id = ? AND clicked_at IS NULL',
        [notificationDeliveryId]
    );
    return result.affectedRows > 0;
}

export async function deleteExpiredNotifications(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM notification_deliveries WHERE delivered_at < DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, "%Y-%m-01")'
    );
    return result.affectedRows;
}