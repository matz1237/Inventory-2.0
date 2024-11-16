import { WAConnection } from '@adiwajshing/baileys';
import fs from 'fs';
import { WHATSAPP_SESSION_FILE } from './config';

let conn: WAConnection | null = null;

export const connectWhatsApp = async () => {
  conn = new WAConnection();

  conn.loadAuthInfo(WHATSAPP_SESSION_FILE);

  conn.on('open', () => {
    const authInfo = conn.base64EncodedAuthInfo();
    fs.writeFileSync(WHATSAPP_SESSION_FILE, JSON.stringify(authInfo, null, '\t'));
  });

  await conn.connect();
};

export const sendTextMessage = async (phoneNumber: string, message: string) => {
  if (!conn) {
    throw new Error('WhatsApp connection not established');
  }

  const chatId = `${phoneNumber}@s.whatsapp.net`;
  await conn.sendMessage(chatId, message);
};