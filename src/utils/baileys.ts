import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';
import { WHATSAPP_SESSION_FILE } from './config';
import { sendOTPWhatsApp } from '../services/authService';
import { generateOTP } from './otpGenerator';
import { ErrorType, AppError } from './errorTypes';
import { redisClient } from '../config/redis';
import { processPhoneNumber, generateRedisKeys,getWhatsAppJID  } from './phoneUtils';

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
                console.log(phoneNumber,'rahi1');
                if (!phoneNumber) {
                    logger.error('Received message with undefined phone number');
                    return;
                }

                try {
                    const processedPhone = processPhoneNumber(phoneNumber);
                    console.log(processedPhone,'rahi2');
                    const { loginRequest: loginRequestKey } = generateRedisKeys(processedPhone);
                    console.log(loginRequestKey,'rahi3');
                    logger.info(`Received message from ${processedPhone.standardized}: "${incomingMessage}"`);

                    if (incomingMessage.toLowerCase() === 'hello, give me access') {
                        try {
                            const loginRequest = await redisClient.get(loginRequestKey);
                            logger.info(`Checking login request for ${processedPhone.standardized}: ${loginRequest}`);
                            
                            if (!loginRequest) {
                                logger.warn(`No login request found for ${processedPhone.standardized}`);
                                await sendMessageWithTyping(processedPhone.standardized, 'Please initiate a login request first at our website.');
                                return;
                            }

                            const otp = generateOTP();
                            await sendOTPWhatsApp(processedPhone.standardized, otp);
                            logger.info(`OTP sent to ${processedPhone.standardized} after receiving access request.`);
                        } catch (error) {
                            logger.error(`Failed to process request for ${processedPhone.standardized}:`, error);
                            await sendMessageWithTyping(processedPhone.standardized, 'Failed to process your request. Please try again.');
                        }
                    } else {
                        logger.warn(`Received invalid message from ${processedPhone.standardized}: ${incomingMessage}`);
                        await sendMessageWithTyping(processedPhone.standardized, 'Please send "Hello, give me access" to receive your OTP.');
                    }
                } catch (error) {
                    logger.error(`Error processing message: ${error}`);
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
    const processedPhone = processPhoneNumber(phoneNumber);
    const jid = getWhatsAppJID(phoneNumber);
    //const jid = `${phoneNumber}@s.whatsapp.net`;
    console.log(jid);
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

    const processedPhone = processPhoneNumber(phoneNumber);
    const jid = getWhatsAppJID(phoneNumber);
        
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
        
        logger.info(`Message sent to ${processedPhone.standardized}`);
    } catch (error) {
        logger.error(`Failed to send message to ${processedPhone.standardized}:`, error);
        throw error;
    }
};

