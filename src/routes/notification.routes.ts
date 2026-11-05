import Router from '@koa/router';
import { processCsvNotification, processFilterNotifications } from "../services/notificationProcessingService";
import { deleteExpiredNotifications, getAccountNotifications, markNotificationAsClicked } from "../services/notificationDeliveryService";
import { getActiveNotificationDefinitions } from '../services/notificationDefinitionService';
import { processNotificationEvent, processScheduledNotifications } from '../services/notificationEventService';
const router = new Router();

router.post("/notifications/process-filter-notifications", async (ctx) => {
    try {
        await processFilterNotifications();
        ctx.status = 200;
        ctx.body = { message: "Filter notifications processed successfully." };
    } catch (error) {
        console.error("Error processing filter notifications:", error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while processing filter notifications." };
    }
});

router.get("/notifications/get-account-notifications/:accountId", async (ctx) => {
    const accountId = Number(ctx.params.accountId);
    if (isNaN(accountId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid accountId parameter." };
        return;
    }

    try {
        const notifications = await getAccountNotifications(accountId);
        ctx.status = 200;
        ctx.body = notifications;
    } catch (error) {
        console.error("Error fetching account notifications:", error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while fetching account notifications." };
    }
});

router.patch("/notifications/:notificationDeliveryId/click", async (ctx) => {
    const notificationDeliveryId = Number(ctx.params.notificationDeliveryId);
    if (isNaN(notificationDeliveryId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid notificationDeliveryId parameter." };
        return;
    }

    try {
        const success = await markNotificationAsClicked(notificationDeliveryId);
        ctx.status = success ? 200 : 404;
        ctx.body = success 
        ? { message: "Notification marked as clicked." } 
        : { message: "Notification not found or already clicked." };   
    } catch (error) {
        console.error("Error marking notification as clicked:", error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while marking notification as clicked." };
    }
});

router.post("/notifications/process-csv-notifications", async (ctx) => {
    try {
        const definitions = await getActiveNotificationDefinitions();
        let totalCreatedCount = 0;
        for (const definition of definitions) {
            if (definition.type === "CSV") {
                const createdCount = await processCsvNotification(definition.id);
                totalCreatedCount += createdCount;
                console.log(`Created ${createdCount} notification deliveries for CSV definition: ${definition.name}`);
            }
        }
        ctx.status = 200;
        ctx.body = { message: "CSV notifications processed successfully.",
            deliveriesCreated: totalCreatedCount };
    } catch (error) {
        console.error("Error processing CSV notifications:", error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while processing CSV notifications." };
    }
});

router.post("/notifications/process-event", async (ctx) => {
    const { eventType, accountId } = ctx.request.body as {
        eventType?: string;
        accountId?: number;
    };

    const validEventTypes = ["SHIPPED", "ENROLLED", "AUDIOBOOK_AVAILABLE"];
    if (!eventType || !validEventTypes.includes(eventType)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid or missing eventType. Valid values are: SHIPPED, ENROLLED, AUDIOBOOK_AVAILABLE." };
        return;
    }

    if (!accountId || isNaN(accountId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid or missing accountId." };
        return;
    }

    try {
        const createdCount = await processNotificationEvent(eventType as any, accountId);
        ctx.status = 200;
        ctx.body = { message: `Processed event ${eventType} for account ${accountId}.`, deliveriesCreated: createdCount };
    } catch (error) {
        console.error(`Error processing event ${eventType} for account ${accountId}:`, error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while processing the notification event." };
    }
});

router.post("/notifications/process-scheduled-notifications", async (ctx) => {
    try {
        const deliveriesProcessed = await processScheduledNotifications();
        ctx.status = 200;
        ctx.body = { message: "Scheduled notifications processed successfully.", deliveriesProcessed };
    } catch (error) {
        console.error("Error processing scheduled notifications:", error);
        ctx.status = 500;
        ctx.body = { message: "An error occurred while processing scheduled notifications." };
    }
});

router.post('/notifications/cleanup-expired', async (ctx) => {
    const deletedCount = await deleteExpiredNotifications();

    ctx.body = {
        deletedCount
    };
});

export default router;

