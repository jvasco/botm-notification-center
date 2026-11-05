import Router from '@koa/router';

const router = new Router();

router.get('/health', async (ctx) => {
    console.log('Health check endpoint called');
    ctx.status = 200;
    ctx.body = {
        "status": "OK",
        "message": "Notification Center is running"
    };
    
});

export default router;