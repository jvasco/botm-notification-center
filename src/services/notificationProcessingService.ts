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
        const createdCount = await createNotificationDeliveries(definition.id, accountIds);
        console.log(`Created ${createdCount} notification deliveries for definition: ${definition.name}`);
    }
}