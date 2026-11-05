import {createNotificationDeliveries} from './notificationDeliveryService';
import {getActiveNotificationDefinitions} from './notificationDefinitionService';
import {getFilterRecipients} from './recipientService';

export async function processFilterNotifications(): Promise<void> {
    const definitions = await getActiveNotificationDefinitions();

    for (const definition of definitions) {
        if (definition.type !== "FILTER") {
            continue;
        }

        const accountIds = await getFilterRecipients(definition.filters);
        const month = new Date().toISOString().slice(0, 7);
        const createdCount = await createNotificationDeliveries(definition.id, accountIds,
             (accountId) => `${definition.id}:${accountId}:${month}`
);
        console.log(`Created ${createdCount} notification deliveries for definition: ${definition.name}`);
    }
}

import { pool } from "../database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function processCsvNotification(
  notificationDefinitionId: number
): Promise<number> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock pending recipients while processing them.
    const [recipients] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, account_id
      FROM notification_csv_recipients
      WHERE notification_definition_id = ?
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [notificationDefinitionId]
    );

    for (const recipient of recipients) {
      const accountId = recipient.account_id;

      const idempotencyKey =
        `${notificationDefinitionId}:${accountId}:${recipient.id}`;

      await connection.execute<ResultSetHeader>(
        `
        INSERT INTO notification_deliveries
          (notification_definition_id, account_id, idempotency_key, delivered_at)
        VALUES (?, ?, ?, NOW())
        `,
        [notificationDefinitionId, accountId, idempotencyKey]
      );

      await connection.execute(
        `
        UPDATE notification_csv_recipients
        SET status = 'PROCESSED',
            processed_at = NOW()
        WHERE id = ?
        `,
        [recipient.id]
      );
    }

    await connection.commit();

    return recipients.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}