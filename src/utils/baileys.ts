import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';
import { WHATSAPP_SESSION_FILE } from './config';
import { generateOTP, sendOTPWhatsApp } from '../services/authService';
import { ErrorType, AppError } from './errorTypes';
import { redisClient } from '../config/redis'; // Assuming you use Redis to track requests
import { standardizePhoneNumber, getRedisPhoneKey } from '../utils/phoneUtils';

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('../logs/whatsapp/wa-logs.txt'));
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
                // Mark message as read
                await client.readMessages([message.key]);

                const incomingMessage = message.message.conversation;
                const phoneNumber = message.key.remoteJid?.split('@')[0];

                if (!phoneNumber) {
                    logger.error('Received message with undefined phone number');
                    return;
                }
                // Standardize the phone number
                const standardizedPhone = getRedisPhoneKey(phoneNumber);

                if (incomingMessage.toLowerCase() === 'hello, give me access') {
                    try {
                        const loginRequest = await redisClient.get(`login_request:${phoneNumber}`);
                        logger.info(`Checking login request for ${standardizedPhone}: ${loginRequest}`);
                        
                        if (!loginRequest) {
                            logger.warn(`No login request found for ${standardizedPhone}. OTP will not be sent.`);
                            await sendMessageWithTyping(standardizedPhone, 'Please initiate a login request first at our website.');
                            return;
                        }

                        const otp = generateOTP();
                        await sendOTPWhatsApp(standardizedPhone, otp);
                        logger.info(`OTP sent to ${standardizedPhone} after receiving access request.`);
                    } catch (error) {
                        logger.error(`Failed to process request for ${standardizedPhone}:`, error);
                        await sendMessageWithTyping(standardizedPhone, 'Failed to process your request. Please try again.');
                    }
                } else {
                    logger.warn(`Received invalid message from ${standardizedPhone}: ${incomingMessage}`);
                    await sendMessageWithTyping(standardizedPhone, 'Please send "Hello, give me access" to receive your OTP.');
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
        const sentMsg = await client.sendMessage(jid, { text: message });
        // Mark sent message as read
        if (sentMsg) {
            await client.readMessages([sentMsg.key]);
        }
        logger.info(`Message sent to ${phoneNumber}`);
    } catch (error) {
        logger.error(`Failed to send message to ${phoneNumber}:`, error);
        throw error;
    }
};

export const sendMessageWithTyping = async (phoneNumber: string, message: string) => {
    if (!client) {
        throw new Error('WhatsApp client not initialized');
    }

    const jid = `${phoneNumber}@s.whatsapp.net`;
    
    try {
        // Show typing indicator
        await client.sendPresenceUpdate('composing', jid);
        
        // Simulate typing delay (1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Stop typing indicator
        await client.sendPresenceUpdate('paused', jid);
        
        // Send the message
        const sentMsg = await client.sendMessage(jid, { text: message });
        
        // Mark sent message as read
        if (sentMsg) {
            await client.readMessages([sentMsg.key]);
        }
        
        logger.info(`Message sent to ${phoneNumber}`);
    } catch (error) {
        logger.error(`Failed to send message to ${phoneNumber}:`, error);
        throw error;
    }
};


