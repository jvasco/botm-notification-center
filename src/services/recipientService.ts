import { pool } from "../database";
import { NotificationFilter } from "../types/notification";
import { RowDataPacket } from "mysql2";

interface AccountRow extends RowDataPacket {
  id: number;
}

const categoricalFilters = [
  "COUNTRY",
  "POLICY",
  "RELATIONSHIP_STATUS",
];

export async function getFilterRecipients(
  filters: NotificationFilter[]
): Promise<number[]> {
  if (filters.length === 0) {
    throw new Error("FILTER notifications must have at least one filter");
  }

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  const groupedFilters = new Map<string, string[]>();

  // Group filters by type.
  for (const filter of filters) {
    const existing = groupedFilters.get(filter.type) ?? [];
    existing.push(filter.value);
    groupedFilters.set(filter.type, existing);
  }

  for (const [type, filterValues] of groupedFilters) {
    if (categoricalFilters.includes(type)) {
      const column = {
        COUNTRY: "country",
        POLICY: "policy",
        RELATIONSHIP_STATUS: "relationship_status",
      }[type] as string;

      const placeholders = filterValues.map(() => "?").join(", ");
      conditions.push(`${column} IN (${placeholders})`);
      values.push(...filterValues);
    } else if (type === "MIN_CREDITS") {
      for (const value of filterValues) {
        const minCredits = Number(value);
        if (!Number.isFinite(minCredits)) {
          throw new Error(`Invalid MIN_CREDITS value: ${value}`);
        }

        conditions.push("credits >= ?");
        values.push(minCredits);
      }
    } else if (type === "MAX_CREDITS") {
      for (const value of filterValues) {
        const maxCredits = Number(value);
        if (!Number.isFinite(maxCredits)) {
          throw new Error(`Invalid MAX_CREDITS value: ${value}`);
        }

        conditions.push("credits <= ?");
        values.push(maxCredits);
      }
    } else {
      throw new Error(`Unsupported filter type: ${type}`);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const [rows] = await pool.execute<AccountRow[]>(
    `SELECT id FROM account ${whereClause}`,
    values
  );

  return rows.map((row) => row.id);
}