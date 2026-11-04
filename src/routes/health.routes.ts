import Router from '@koa/router';

const router = new Router();

router.get('/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = {
        "status": "OK",
        "message": "Notification Center is running"
    };
    console.log('Health check endpoint called');
});

export default router;