// jobs/scheduler.js
import cron from 'node-cron';
import { addEmailJob, emailQueue } from './emailQueue.js';

class JobScheduler {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
    }

    // Initialize all scheduled jobs
    async initialize() {
        if (this.isInitialized) {
            console.log('Scheduler already initialized');
            return;
        }

        console.log('Initializing job scheduler...');
        
        try {
            // Schedule daily reminder at 9:00 AM
            this.scheduleDailyReminder();
            
            // Schedule weekly summary on Sundays at 8:00 AM
            this.scheduleWeeklySummary();
            
            // Schedule health check every hour
            this.scheduleHealthCheck();
            
            // Schedule queue cleanup daily at midnight
            this.scheduleQueueCleanup();
            
            // Schedule database backup daily at 2:00 AM
            this.scheduleDatabaseBackup();
            
            this.isInitialized = true;
            console.log('All scheduled jobs initialized');
            
            // Log active tasks
            this.logActiveTasks();
            
        } catch (error) {
            console.error('Failed to initialize scheduler:', error);
            throw error;
        }
    }

    // Schedule daily reminder emails
    scheduleDailyReminder() {
        const cronExpression = process.env.DAILY_REMINDER_CRON || '0 9 * * *'; // 9:00 AM daily
        
        const task = cron.schedule(cronExpression, async () => {
            console.log('Triggering daily reminder job...');
            
            try {
                await addEmailJob('daily_reminder', {
                    subject: 'Your Daily Reminder - Don\'t Miss Out!',
                    content: 'Hello! Just a friendly reminder to check your account and see what\'s new today.',
                    title: 'Daily Check-in',
                    actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
                    buttonText: 'Open Dashboard'
                });
                
                console.log('Daily reminder job scheduled successfully');
                
            } catch (error) {
                console.error('Failed to schedule daily reminder:', error);
            }
        }, {
            scheduled: false, // Don't start immediately
            timezone: process.env.TIMEZONE || 'Asia/Kolkata'
        });

        this.tasks.set('daily_reminder', task);
        console.log(`Daily reminder scheduled: ${cronExpression}`);
    }

    // Schedule weekly summary emails
    scheduleWeeklySummary() {
        const cronExpression = process.env.WEEKLY_SUMMARY_CRON || '0 8 * * 0'; // 8:00 AM on Sundays
        
        const task = cron.schedule(cronExpression, async () => {
            console.log('Triggering weekly summary job...');
            
            try {
                await addEmailJob('weekly_summary', {
                    subject: 'Your Weekly Summary',
                    content: 'Here\'s a summary of your account activity for the past week. See what you\'ve accomplished!',
                    actionUrl: `${process.env.FRONTEND_URL}/analytics`,
                    buttonText: 'View Analytics'
                });
                
                console.log('Weekly summary job scheduled successfully');
                
            } catch (error) {
                console.error('Failed to schedule weekly summary:', error);
            }
        }, {
            scheduled: false,
            timezone: process.env.TIMEZONE || 'Asia/Kolkata'
        });

        this.tasks.set('weekly_summary', task);
        console.log(`Weekly summary scheduled: ${cronExpression}`);
    }

    // Schedule health check for the email queue
    scheduleHealthCheck() {
        const task = cron.schedule('*0 * * * *', async () => { // Every hour
            try {
                const stats = await this.getQueueStats();
                console.log('Queue Health Check:', stats);
                
                // Alert if too many failed jobs
                if (stats.failed > 50) {
                    console.warn('High number of failed jobs detected:', stats.failed);
                    // You could send an alert email to admins here
                }
                
                // Alert if queue is backed up
                if (stats.waiting > 100) {
                    console.warn('Queue backlog detected:', stats.waiting);
                }
                
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, {
            scheduled: false
        });

        this.tasks.set('health_check', task);
        console.log('Health check scheduled: every hour');
    }

    // Schedule queue cleanup
    scheduleQueueCleanup() {
        const task = cron.schedule('0 0 * * *', async () => { // Daily at midnight
            console.log('Cleaning up old job data...');
            
            try {
                await emailQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Remove completed jobs older than 1 day
                await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Remove failed jobs older than 7 days
                
                console.log('Queue cleanup completed');
                
            } catch (error) {
                console.error('Queue cleanup failed:', error);
            }
        }, {
            scheduled: false
        });

        this.tasks.set('cleanup', task);
        console.log('Queue cleanup scheduled: daily at midnight');
    }

    // Schedule database backup
    scheduleDatabaseBackup() {
        const cronExpression = process.env.DB_BACKUP_CRON || '30 23 * * *'; 
// 11:30 PM daily
        
        const task = cron.schedule(cronExpression, async () => {
            console.log('Triggering database backup job...');
            try {
                await this.triggerDatabaseBackup();
            } catch (error) {
                console.error('Database backup job failed:', error);
            }
        }, {
            scheduled: false
        });

        this.tasks.set('database_backup', task);
        console.log('Database backup scheduled:', cronExpression);
    }

    // Get queue statistics
    async getQueueStats() {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                emailQueue.getWaiting(),
                emailQueue.getActive(),
                emailQueue.getCompleted(),
                emailQueue.getFailed()
            ]);

            return {
                waiting: waiting.length || 0,
                active: active.length || 0,
                completed: completed.length || 0,
                failed: failed.length || 0
            };
        } catch (error) {
            console.error('Failed to get queue stats:', error);
            return { waiting: 0, active: 0, completed: 0, failed: 0 };
        }
    }

    // Start all scheduled tasks
    startAll() {
        console.log('Starting all scheduled tasks...');
        
        let started = 0;
        for (const [name, task] of this.tasks) {
            try {
                task.start();
                console.log(`Started task: ${name}`);
                started++;
            } catch (error) {
                console.error(`Failed to start task ${name}:`, error);
            }
        }
        
        console.log(`Started ${started}/${this.tasks.size} scheduled tasks`);
    }

    // Stop all scheduled tasks
    stopAll() {
        console.log('Stopping all scheduled tasks...');
        
        let stopped = 0;
        for (const [name, task] of this.tasks) {
            try {
                task.stop();
                console.log(`Stopped task: ${name}`);
                stopped++;
            } catch (error) {
                console.error(`Failed to stop task ${name}:`, error);
            }
        }
        
        console.log(`Stopped ${stopped}/${this.tasks.size} scheduled tasks`);
    }

    // Start specific task
    startTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.start();
            console.log(`Started task: ${taskName}`);
        } else {
            console.error(`Task not found: ${taskName}`);
        }
    }

    // Stop specific task
    stopTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.stop();
            console.log(`Stopped task: ${taskName}`);
        } else {
            console.error(`Task not found: ${taskName}`);
        }
    }

    // Log active tasks
    logActiveTasks() {
        console.log('Active scheduled tasks:');
        for (const [name, task] of this.tasks) {
            const status = task.getStatus() || 'unknown';
            console.log(`  - ${name}: ${status}`);
        }
    }

    // Add a custom scheduled job
    addCustomJob(name, cronExpression, jobFunction, options = {}) {
        if (this.tasks.has(name)) {
            console.warn(`Task ${name} already exists. Stopping existing task.`);
            this.stopTask(name);
        }

        const task = cron.schedule(cronExpression, jobFunction, {
            scheduled: false,
            timezone: process.env.TIMEZONE || 'America/New_York',
            ...options
        });

        this.tasks.set(name, task);
        console.log(`Custom job scheduled: ${name} - ${cronExpression}`);
        
        return task;
    }

    // Remove a scheduled job
    removeJob(name) {
        const task = this.tasks.get(name);
        if (task) {
            task.stop();
            task.destroy();
            this.tasks.delete(name);
            console.log(`Removed task: ${name}`);
        } else {
            console.error(`Task not found: ${name}`);
        }
    }

    // Trigger database backup
    async triggerDatabaseBackup(options = {}) {
        console.log('🗄️ Triggering database backup...');
        
        try {
            const defaultOptions = {
                compress: true,
                cleanup: true,
                gzip: false
            };
            
            const backupData = {
                ...defaultOptions,
                ...options,
                triggered: 'scheduled'
            };
            
            const job = await addEmailJob('database_backup', backupData, {
                priority: 50, // Medium priority
                delay: 0
            });
            
            console.log(`Database backup job triggered. Job ID: ${job.id}`);
            return job;
            
        } catch (error) {
            console.error('Failed to trigger database backup:', error);
            throw error;
        }
    }

    // Trigger a job immediately (for testing)
    async triggerJobNow(jobType, data = {}) {
        console.log(`Triggering ${jobType} job immediately...`);
        
        try {
            const job = await addEmailJob(jobType, data, {
                priority: 100, // High priority for manual triggers
                delay: 0 // No delay
            });
            
            console.log(`Job ${jobType} triggered successfully. Job ID: ${job.id}`);
            return job;
            
        } catch (error) {
            console.error(`Failed to trigger job ${jobType}:`, error);
            throw error;
        }
    }
}

// Create singleton instance
export const scheduler = new JobScheduler();

// Export convenience functions
export const initializeScheduler = () => scheduler.initialize();
export const startAllJobs = () => scheduler.startAll();
export const stopAllJobs = () => scheduler.stopAll();
export const triggerJobNow = (jobType, data) => scheduler.triggerJobNow(jobType, data);
export const addCustomJob = (name, cron, fn, options) => scheduler.addCustomJob(name, cron, fn, options);

export default scheduler;