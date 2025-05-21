import twilio from 'twilio';
import { config } from '../config/env.js';

const client = twilio(config.twillio.sid, config.twillio.token);

export const sendSMS = async ({ to, body }) => {
    try {
        const message = await client.messages.create({
        body,
        from: config.twillio.phone,
        to,
        });
        return message;
    } catch (error) {
        throw new Error(error.message || 'Failed to send SMS');
    }
};
