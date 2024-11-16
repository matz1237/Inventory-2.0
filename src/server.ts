import server from './app';
import { PORT } from './utils/config';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { connectWhatsApp } from './utils/baileys';

const startServer = async () => {
  await connectDB();
  await connectRedis();
  await connectWhatsApp();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup error:', error);
});