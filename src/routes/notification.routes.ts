import Router from '@koa/router';
import { processFilterNotifications } from "../services/notificationProcessingService";
import { getAccountNotifications } from "../services/notificationDeliveryService";
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


export default router;

