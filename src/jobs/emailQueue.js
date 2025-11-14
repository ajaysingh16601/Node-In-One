// jobs/emailQueue.js
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendBulkEmails } from '../utils/email.js';
import User from '../modules/v1/user/user.model.js';
import { createBackup } from '../utils/databaseBackup.js';

// Redis Configuration with Fallback
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    family: 4,
};

let connection = null;
let isRedisAvailable = false;

// Try to create Redis connection with fallback
async function initializeRedis() {
    try {
        connection = new Redis(redisConfig);
        console.log('Attempting to connect to Redis for BullMQ...');
            await connection.connect();
        // Test the connection
        await connection.ping();
        isRedisAvailable = true;
        
        console.log('Redis connected for BullMQ');
        
        // Redis Event Handlers
        connection.on('error', (err) => {
            console.error('Redis error:', err.message);
            isRedisAvailable = false;
        });
        
        connection.on('reconnecting', () => {
            console.log('Redis reconnecting...');
            isRedisAvailable = false;
        });
        
        connection.on('connect', () => {
            console.log('Redis reconnected');
            isRedisAvailable = true;
        });
        
        return connection;
        
    } catch (error) {
        console.warn('Redis not available, falling back to in-memory job processing');        
        isRedisAvailable = false;
        return null;
    }
}

// Email Job Queue with Fallback
let emailQueue = null;
let emailWorker = null;

// In-memory job store for fallback (when Redis is not available)
let inMemoryJobs = [];
let jobIdCounter = 1;

// Initialize the job system
export async function initializeEmailQueue() {
    await initializeRedis();
    if (isRedisAvailable && connection) {
        // Use Redis-based BullMQ
        
        emailQueue = new Queue('email-reminders', {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: 50,
                removeOnFail: 100,
            },
        });

        emailWorker = new Worker(
            'email-reminders',
            async (job) => {
                const { type, data } = job.data;
                console.log(`Processing email job: ${type} (Job ID: ${job.id})`);

                try {
                    switch (type) {
                        case 'daily_reminder':
                            return await processDailyReminderJob(data);
                        case 'weekly_summary':
                            return await processWeeklySummaryJob(data);
                        case 'custom_reminder':
                            return await processCustomReminderJob(data);
                        case 'database_backup':
                            return await processDatabaseBackupJob(data);
                        default:
                            throw new Error(`Unknown job type: ${type}`);
                    }
                } catch (error) {
                    console.error(`Job failed: ${error.message}`);
                    throw error;
                }
            },
            {
                connection,
                concurrency: 5,
            }
        );

        // Worker event handlers
        emailWorker.on('completed', (job, result) => {
            console.log(`Job ${job.id} completed:`, result);
        });

        emailWorker.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err.message);
        });
        
    } else {
        // Use in-memory fallback
        console.log('Initializing in-memory job processing (Redis fallback)...');
        console.log('Note: Jobs will be processed immediately without queuing');
    }
}

// Add job function with fallback
export const addEmailJob = async (type, data, options = {}) => {
    try {
        if (isRedisAvailable && emailQueue) {
            // Use Redis-based queue
            const job = await emailQueue.add(type, { type, data }, options);
            console.log(`Email job added to queue: ${type} - Job ID: ${job.id}`);
            return job;
        } else {
            // Use in-memory fallback - process immediately
            const jobId = `mem_${jobIdCounter++}`;
            const job = {
                id: jobId,
                type,
                data,
                timestamp: Date.now(),
                status: 'processing'
            };
            
            console.log(`Processing email job immediately: ${type} - Job ID: ${jobId}`);
            
            // Process immediately in background
            setImmediate(async () => {
                try {
                    let result;
                    switch (type) {
                        case 'daily_reminder':
                            result = await processDailyReminderJob(data);
                            break;
                        case 'weekly_summary':
                            result = await processWeeklySummaryJob(data);
                            break;
                        case 'custom_reminder':
                            result = await processCustomReminderJob(data);
                            break;
                        case 'database_backup':
                            result = await processDatabaseBackupJob(data);
                            break;
                        default:
                            throw new Error(`Unknown job type: ${type}`);
                    }
                    
                    job.status = 'completed';
                    job.result = result;
                    job.finishedAt = Date.now();
                    
                    // Store in memory for history
                    inMemoryJobs.push(job);
                    
                    // Keep only last 100 jobs
                    if (inMemoryJobs.length > 100) {
                        inMemoryJobs = inMemoryJobs.slice(-100);
                    }
                    
                    console.log(`In-memory job ${jobId} completed:`, result);
                    
                } catch (error) {
                    job.status = 'failed';
                    job.error = error.message;
                    job.finishedAt = Date.now();
                    
                    inMemoryJobs.push(job);
                    console.error(`In-memory job ${jobId} failed:`, error.message);
                }
            });
            
            return job;
        }
    } catch (error) {
        console.error(`Failed to add email job: ${error.message}`);
        throw error;
    }
};

// Get queue stats with fallback
export const getQueueStats = async () => {
    if (isRedisAvailable && emailQueue) {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                emailQueue.getWaiting(),
                emailQueue.getActive(),
                emailQueue.getCompleted(),
                emailQueue.getFailed()
            ]);

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length
            };
        } catch (error) {
            console.error('Failed to get Redis queue stats:', error);
            return { waiting: 0, active: 0, completed: 0, failed: 0 };
        }
    } else {
        // Return in-memory stats
        const completed = inMemoryJobs.filter(j => j.status === 'completed').length;
        const failed = inMemoryJobs.filter(j => j.status === 'failed').length;
        
        return {
            waiting: 0,
            active: 0,
            completed,
            failed
        };
    }
};

// Get job history with fallback
export const getJobHistory = async (limit = 20) => {
    if (isRedisAvailable && emailQueue) {
        try {
            const [completedJobs, failedJobs] = await Promise.all([
                emailQueue.getCompleted(),
                emailQueue.getFailed()
            ]);

            const allJobs = [...completedJobs, ...failedJobs];
            allJobs.sort((a, b) => b.timestamp - a.timestamp);
            
            return allJobs.slice(0, limit).map(job => ({
                id: job.id,
                name: job.name,
                data: job.data,
                timestamp: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
                returnValue: job.returnValue,
                failedReason: job.failedReason,
                status: job.finishedOn ? 'completed' : 'failed'
            }));
        } catch (error) {
            console.error('Failed to get Redis job history:', error);
            return [];
        }
    } else {
        // Return in-memory job history
        return inMemoryJobs
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map(job => ({
                id: job.id,
                name: job.type,
                data: job.data,
                timestamp: job.timestamp,
                finishedOn: job.finishedAt,
                returnValue: job.result,
                failedReason: job.error,
                status: job.status
            }));
    }
};

// Process daily reminder job
async function processDailyReminderJob(data) {
    console.log('Starting daily reminder job...');
    
    // Get all active users
    const users = await User.find({ 
        isActive: true, 
        isDeleted: false,
        emailVerified: true 
    }).select('email firstname lastname lastLoginAt createdAt');
    
    if (users.length === 0) {
        console.log('No active users found for daily reminder');
        return { sent: 0, failed: 0, message: 'No active users' };
    }
    
    // Prepare email data for each user
    const emailList = users.map(user => ({
        email: user.email,
        subject: data.subject || 'Your Daily Reminder',
        content: data.content || 'Don\'t forget to check your dashboard today!',
        templateData: {
            firstName: user.firstname,
            title: data.title || 'Daily Reminder',
            actionUrl: data.actionUrl || `${process.env.FRONTEND_URL}/dashboard`,
            buttonText: data.buttonText || 'Visit Dashboard',
            unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user._id}`
        }
    }));
    
    // Send emails in batches
    const results = await sendBulkEmails(emailList, 10, 2000); // 10 emails per batch, 2 second delay
    
    // Count results
    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
    
    console.log(`Daily reminder job completed: ${sent} sent, ${failed} failed`);
    
    // Log failed emails for debugging
    const failedEmails = results
        .filter(r => r.status === 'rejected' || !r.value.success)
        .map(r => r.value?.email || 'unknown');
    
    if (failedEmails.length > 0) {
        console.log('Failed emails:', failedEmails);
    }
    
    return {
        sent,
        failed,
        totalUsers: users.length,
        failedEmails
    };
}

// Process weekly summary job
async function processWeeklySummaryJob(data) {
    console.log('Starting weekly summary job...');
    
    // Get users who were active in the last week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const users = await User.find({
        isActive: true,
        isDeleted: false,
        emailVerified: true,
        lastLoginAt: { $gte: oneWeekAgo }
    }).select('email firstname lastname lastLoginAt');
    
    const emailList = users.map(user => ({
        email: user.email,
        subject: data.subject || 'Your Weekly Summary',
        content: data.content || 'Here\'s what happened in your account this week!',
        templateData: {
            firstName: user.firstname,
            title: 'Weekly Summary',
            actionUrl: data.actionUrl || `${process.env.FRONTEND_URL}/analytics`,
            buttonText: 'View Analytics',
            unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user._id}`
        }
    }));
    
    const results = await sendBulkEmails(emailList, 5, 3000);
    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
    
    console.log(`Weekly summary job completed: ${sent} sent, ${failed} failed`);
    
    return { sent, failed, totalUsers: users.length };
}

// Process custom reminder job
async function processCustomReminderJob(data) {
    console.log('Starting custom reminder job...');
    
    const { userFilter = {}, emailData } = data;
    
    // Apply custom filters
    const query = {
        isActive: true,
        isDeleted: false,
        emailVerified: true,
        ...userFilter
    };
    
    const users = await User.find(query).select('email firstname lastname');
    
    const emailList = users.map(user => ({
        email: user.email,
        subject: emailData.subject,
        content: emailData.content,
        templateData: {
            firstName: user.firstname,
            ...emailData.templateData
        }
    }));
    
    const results = await sendBulkEmails(emailList);
    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
    
    console.log(`Custom reminder job completed: ${sent} sent, ${failed} failed`);
    
    return { sent, failed, totalUsers: users.length };
}

// Process database backup job
async function processDatabaseBackupJob(data) {
    console.log('🗄️ Starting database backup job...');
    
    try {
        const backupOptions = {
            compress: data.compress || true,
            cleanup: data.cleanup !== false,
            gzip: data.gzip || false,
            backupName: data.backupName,
            collections: data.collections || null
        };
        
        console.log('⚙️ Backup options:', backupOptions);
        
        // Perform the backup
        const backupResult = await createBackup(backupOptions);
        
        if (backupResult.success) {
            console.log('✅ Database backup completed successfully');
            console.log('📊 Backup details:', {
                name: backupResult.backupName,
                duration: `${Math.round(backupResult.duration / 1000)}s`,
                size: backupResult.stats?.sizeFormatted
            });
            
            return {
                success: true,
                backupName: backupResult.backupName,
                backupPath: backupResult.backupPath,
                duration: backupResult.duration,
                size: backupResult.stats?.sizeBytes,
                sizeFormatted: backupResult.stats?.sizeFormatted,
                databases: backupResult.stats?.databases,
                timestamp: backupResult.timestamp,
                compressed: backupOptions.compress
            };
        } else {
            throw new Error(backupResult.error);
        }
        
    } catch (error) {
        console.error('❌ Database backup job failed:', error.message);
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down email system...');
    
    if (emailWorker) {
        await emailWorker.close();
    }
    
    if (connection) {
        await connection.quit();
    }
    
    process.exit(0);
});
    
export { emailQueue, emailWorker };