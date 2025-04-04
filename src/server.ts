import fs from 'fs';
import path from 'path';
import server from './app';
import { PORT } from './utils/config';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { connectWhatsApp } from './utils/baileys';

const sessionDir = path.join(__dirname, '..', '..', 'session', 'whatsapp_session');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

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