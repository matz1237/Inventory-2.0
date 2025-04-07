import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { setupSocketIO } from './config/socket';
import { otpRateLimiter, loginRateLimiter } from './middleware/rateLimitMiddleware';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import roleRoutes from './routes/roleRoutes';
import fileUploadRoutes from './routes/fileUploadRoutes';
import { deviceTrackingMiddleware } from './middleware/deviceTrackingMiddleware';

const app = express();
const server = require('http').createServer(app);
export const io = require('socket.io')(server);

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

//app.use(deviceTrackingMiddleware);

app.use('/api/auth',authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/files', fileUploadRoutes);

setupSocketIO();

export { app };
export default server;