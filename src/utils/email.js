// utils/email.js
import sgMail from '@sendgrid/mail';
import { config } from '../config/env.js';
sgMail.setApiKey(config.email.user);

export const sendEmail = async (to, message) => {
    const msg = {
        to,
        from: config.email.pass,
        subject: 'Your OTP Code',
        text: message,
        html: `<p>${message}</p>`,
    };

    try {
        await sgMail.send(msg);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Failed to send email:', error.response?.body || error.message);
        throw new Error('Failed to send email');
    }
};