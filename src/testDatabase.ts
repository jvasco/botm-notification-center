import { getActiveNotificationDefinitions } from "./services/notificationDefinitionService";
import { getFilterRecipients } from "./services/recipientService";
import { createNotificationDeliveries } from "./services/notificationDeliveryService";
import { pool } from "./database";

async function main() {
  try {
    const definitions = await getActiveNotificationDefinitions();

    for (const definition of definitions) {
      console.log(`\nNotification: ${definition.name}`);

      if (definition.type !== "FILTER") {
        console.log("Skipping:", definition.type);
        continue;
      }

      const accountIds = await getFilterRecipients(definition.filters);
      const createdCount = await createNotificationDeliveries(
  definition.id,
  accountIds
);

console.log("Matching account IDs:", accountIds);
console.log("Created deliveries:", createdCount);

      console.log("Matching account IDs:", accountIds);
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);