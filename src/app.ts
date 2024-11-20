import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { setupSocketIO } from './config/socket';
import { otpRateLimiter, registerRateLimiter } from './middleware/rateLimitMiddleware';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import roleRoutes from './routes/roleRoutes';

const app = express();
const server = require('http').createServer(app);
export const io = require('socket.io')(server);

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', otpRateLimiter, registerRateLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/roles', roleRoutes);

setupSocketIO();

export { app };
export default server;