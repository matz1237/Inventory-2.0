import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';
import { WHATSAPP_SESSION_FILE } from './config';
import { generateOTP } from '../services/authService';
import { ErrorType, AppError } from './errorTypes';

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./logs/whatsapp/wa-logs.txt'));
logger.level = 'trace';

let client: WASocket;

export const connectWhatsApp = async () => {
    try{
    // Ensure session directory exists
    if (!fs.existsSync(WHATSAPP_SESSION_FILE)) {
        fs.mkdirSync(WHATSAPP_SESSION_FILE, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(WHATSAPP_SESSION_FILE);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WhatsApp Web version ${version}, isLatest: ${isLatest}`);

    client = makeWASocket({
        logger,
        printQRInTerminal: true,  // This is important for showing QR
        auth: state,
        browser: ['Inventory 2.0', 'Desktop', '1.0.0']
    });

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                await connectWhatsApp();
            }
        }
        
        console.log('connection update', update);
    });

    client.ev.on('creds.update', saveCreds);

    return client 
} catch(error){
   logger.error('WhatsApp connection error:', error)
    throw new AppError(
        ErrorType.WHATSAPP_CONNECTION_ERROR,
        'Failed to connect to WhatsApp service',
        503
    );
}
};
// Add a helper function for sending messages with rate limiting
export const sendMessage = async (phoneNumber: string, message: string) => {
    if (!client) {
        throw new Error('WhatsApp client not initialized');
    }

    const jid = `${phoneNumber}@s.whatsapp.net`;
    
    try {
        await client.sendMessage(jid, { text: message });
        logger.info(`Message sent to ${phoneNumber}`);
    } catch (error) {
        logger.error(`Failed to send message to ${phoneNumber}:`, error);
        throw error;
    }
};