import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/database';
import { createNotificationDeliveries } from '../src/services/notificationDeliveryService';

after(async () => {
    await pool.end();
});

test('prevents duplicate FILTER deliveries for the same month', async () => {
    const definitionId = 1;
    const accountId = 2;
    const month = new Date().toISOString().slice(0, 7);

    // Unique test identifier avoids collisions with existing deliveries.
    const key = `test:${definitionId}:${accountId}:${month}:${randomUUID()}`;

    try {
        const firstCount = await createNotificationDeliveries(
            definitionId,
            [accountId],
            () => key
        );

        const secondCount = await createNotificationDeliveries(
            definitionId,
            [accountId],
            () => key
        );

        assert.equal(firstCount, 1);
        assert.equal(secondCount, 0);

        const [rows] = await pool.query(
            `SELECT COUNT(*) AS count
             FROM notification_deliveries
             WHERE notification_definition_id = ?
               AND idempotency_key = ?`,
            [definitionId, key]
        );

        assert.equal((rows as { count: number }[])[0].count, 1);
    } finally {
        await pool.query(
            `DELETE FROM notification_deliveries
             WHERE notification_definition_id = ?
               AND idempotency_key = ?`,
            [definitionId, key]
        );
    }
});