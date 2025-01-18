import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';
import { WHATSAPP_SESSION_FILE } from './config';
import { generateOTP } from '../services/authService';
import { ErrorType, AppError } from './errorTypes';
import { redisClient } from '../config/redis'; // Assuming you use Redis to track requests

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./logs/whatsapp/wa-logs.txt'));
logger.level = 'trace';

let client: WASocket;

export const connectWhatsApp = async () => {
    try {
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

        // Listen for incoming messages
        client.ev.on('messages.upsert', async (messageUpdate) => {
            const message = messageUpdate.messages[0];
            if (!message.key.fromMe && message.message?.conversation) {
                const incomingMessage = message.message.conversation;
                const phoneNumber = message.key.remoteJid?.split('@')[0];

                if (!phoneNumber) {
                    logger.error('Received message with undefined phone number');
                    return;
                }

                // Check if the incoming message is the access request
                if (incomingMessage.toLowerCase() === 'hello, give me access') {
                    // Check if a login request has been made
                    const loginRequest = await redisClient.get(`login_request:${phoneNumber}`);
                    if (!loginRequest) {
                        logger.warn(`No login request found for ${phoneNumber}. OTP will not be sent.`);
                        await sendMessage(phoneNumber, 'Please initiate a login request before requesting an OTP.');
                        return;
                    }

                    const otp = generateOTP();
                    await redisClient.setEx(`otp:${phoneNumber}`, 300, otp); // Store OTP for 5 minutes
                    await sendOTPWhatsApp(phoneNumber, otp);
                    logger.info(`OTP sent to ${phoneNumber} after receiving access request.`);
                } else {
                    logger.warn(`Received invalid message from ${phoneNumber}: ${incomingMessage}`);
                    // Optionally, you can send a response back to the user indicating the expected message
                    await sendMessage(phoneNumber, 'Please send "Hello, give me access" to receive your OTP.');
                }
            }
        });

        return client;
    } catch (error) {
        logger.error('WhatsApp connection error:', error);
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

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  try {
    const message = `Your OTP is: ${otp}`;
    await sendMessage(phoneNumber, message);
    console.log(`WhatsApp message sent to ${phoneNumber}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to send WhatsApp message to ${phoneNumber}: ${error.message}`, error);
    } else {
      console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error);
    }
    throw new AppError(
      ErrorType.OTP_DELIVERY_ERROR,
      'Failed to send OTP via WhatsApp',
      503
    );
  }
};