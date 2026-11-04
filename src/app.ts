import Koa from 'koa';
import bodyParser from '@koa/bodyparser'
import healthRouter from './routes/health.routes.js';
const app = new Koa();

app.use(bodyParser());
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

export default app;