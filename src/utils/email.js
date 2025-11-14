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
        if(process.env.NODE_ENV !== 'production'){
            console.log(`Email sent to ${to}`);
        }
    } catch (error) {
        console.error('Failed to send email:', error.response?.body || error.message);
        throw new Error('Failed to send email');
    }
};

// Enhanced email function for reminders
export const sendReminderEmail = async (to, subject, content, templateData = {}) => {
    const msg = {
        to,
        from: {
            email: config.email.pass,
            name: process.env.APP_NAME || 'Your App'
        },
        subject,
        text: content,
        html: generateReminderHTML(content, templateData),
        // Add tracking and analytics
        trackingSettings: {
            clickTracking: {
                enable: true
            },
            openTracking: {
                enable: true
            }
        }
    };

    try {
        await sgMail.send(msg);
        console.log(`Reminder email sent to ${to}`);
        return { success: true, email: to };
    } catch (error) {
        console.error(`Failed to send reminder email to ${to}:`, error.response?.body || error.message);
        return { success: false, email: to, error: error.message };
    }
};

// Generate HTML template for reminder emails
const generateReminderHTML = (content, templateData) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Reminder</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${templateData.title || 'Daily Reminder'}</h1>
        </div>
        <div class="content">
            <p>Hello ${templateData.firstName || 'there'}!</p>
            <p>${content}</p>
            ${templateData.actionUrl ? `<a href="${templateData.actionUrl}" class="button">${templateData.buttonText || 'Take Action'}</a>` : ''}
            <p>Have a great day!</p>
        </div>
        <div class="footer">
            <p>This is an automated reminder from ${process.env.APP_NAME || 'Your App'}</p>
            <p>If you don't want to receive these emails, <a href="${templateData.unsubscribeUrl || '#'}">unsubscribe here</a></p>
        </div>
    </body>
    </html>
    `;
};

// Send bulk emails with rate limiting
export const sendBulkEmails = async (emailList, batchSize = 10, delayMs = 1000) => {
    const results = [];
    
    for (let i = 0; i < emailList.length; i += batchSize) {
        const batch = emailList.slice(i, i + batchSize);
        
        const batchPromises = batch.map(emailData => 
            sendReminderEmail(
                emailData.email, 
                emailData.subject, 
                emailData.content, 
                emailData.templateData
            )
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < emailList.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    return results;
};