import { pool } from "../database";
import {
  NotificationDefinition,
  NotificationFilter,
} from "../types/notification";

export async function getActiveNotificationDefinitions(): Promise<NotificationDefinition[]> {
  const [rows] = await pool.execute(`
    SELECT
      nd.id AS definition_id,
      nd.name AS definition_name,
      nd.type AS definition_type,
      nd.is_active AS definition_is_active,
      nd.created_at AS definition_created_at,
      nd.updated_at AS definition_updated_at,
      f.id AS filter_id,
      f.filter_type,
      f.filter_value
    FROM notification_definitions nd
    LEFT JOIN notification_definition_filters f
      ON nd.id = f.notification_definition_id
    WHERE nd.is_active = 1
  `);

  const definitions = new Map<number, NotificationDefinition>();

  for (const row of rows as any[]) {
    if (!definitions.has(row.definition_id)) {
      definitions.set(row.definition_id, {
          id: row.definition_id,
          name: row.definition_name,
          type: row.definition_type,
          isActive: Boolean(row.definition_is_active),
          filters: [],
          createdAt: row.definition_created_at,
          updatedAt: row.definition_updated_at,
      });
    }

    if (row.filter_id !== null) {
      definitions.get(row.definition_id)!.filters.push({
        id: row.filter_id,
        type: row.filter_type,
        value: row.filter_value,
      });
    }
  }

  return Array.from(definitions.values());
}