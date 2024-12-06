import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';
import { WHATSAPP_SESSION_FILE } from './config';
import { generateOTP } from '../services/authService'; // Assuming generateOTP is defined in authService

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'));
logger.level = 'trace';

let sock: any;
let isInitialConnection = true;

export const connectWhatsApp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(WHATSAPP_SESSION_FILE);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  if (isInitialConnection) {
    console.log(`Using WhatsApp Web version ${version}, isLatest: ${isLatest}`);
    isInitialConnection = false;
  }
  const sock = makeWASocket({
    logger,
    printQRInTerminal: true,
    auth: state,
    version,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
      if (shouldReconnect) {
        connectWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && m.type === 'notify') {
      const phoneNumber = msg.key.remoteJid?.split('@')[0];
      const messageContent = msg.message?.conversation || '';

      if (messageContent.toLowerCase().includes('otp')) {
        const otp = generateOTP();
        const responseMessage = `Your OTP is ${otp}. Valid for 5 minutes.`;
        await sock.sendMessage(msg.key.remoteJid!, { text: responseMessage },{ quoted: msg });
        console.log(`Sent OTP to ${phoneNumber}: ${otp}`);
      }
    }
  });
};

//export the sendMessage function
export const sendMessage = async (phoneNumber: string, message: string) => {
  if(!sock){
    throw new Error('WhatsApp not connected. Call connectWhatsApp() first');
  }
  await sock.sendMessage(`${phoneNumber}@s.whatsapp.net`, { text: message });

}
connectWhatsApp().catch((err) => console.error('WhatsApp startup error:', err));