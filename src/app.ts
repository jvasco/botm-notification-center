import Koa from 'koa';
import bodyParser from '@koa/bodyparser'
import healthRouter from './routes/health.routes.js';
import notificationRouter from './routes/notification.routes.js';
import { processFilterNotifications } from "./services/notificationProcessingService";

const app = new Koa();

app.use(bodyParser());
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

app.use(notificationRouter.routes());
app.use(notificationRouter.allowedMethods());



export default app;