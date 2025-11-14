// controllers/jobController.js
import { addEmailJob, getQueueStats, getJobHistory as getEmailJobHistory } from '../jobs/emailQueue.js';
import { scheduler, triggerJobNow } from '../jobs/scheduler.js';
import User from '../modules/v1/user/user.model.js';
import { listBackups, deleteBackup, restoreBackup, createBackup } from '../utils/databaseBackup.js';

// Get job queue statistics
export const getJobStats = async (req, res) => {
    try {
        const stats = await getQueueStats();

        res.json({
            success: true,
            stats: {
                ...stats,
                totalProcessed: stats.completed + stats.failed
            },
            queueHealth: stats.failed < 10 ? 'healthy' : 'needs_attention'
        });

    } catch (error) {
        console.error('Failed to get job stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job statistics',
            error: error.message
        });
    }
};

// Trigger a job immediately
export const triggerJob = async (req, res) => {
    try {
        const { jobType, data = {} } = req.body;

        if (!jobType) {
            return res.status(400).json({
                success: false,
                message: 'Job type is required'
            });
        }

        const validJobTypes = ['daily_reminder', 'weekly_summary', 'custom_reminder', 'database_backup'];
        if (!validJobTypes.includes(jobType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid job type. Valid types: ${validJobTypes.join(', ')}`
            });
        }

        const job = await triggerJobNow(jobType, data);

        res.json({
            success: true,
            message: `Job ${jobType} triggered successfully`,
            jobId: job.id
        });

    } catch (error) {
        console.error('Failed to trigger job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger job',
            error: error.message
        });
    }
};

// Send custom email to specific users
export const sendCustomEmail = async (req, res) => {
    try {
        const {
            subject,
            content,
            userFilter = {},
            templateData = {}
        } = req.body;

        if (!subject || !content) {
            return res.status(400).json({
                success: false,
                message: 'Subject and content are required'
            });
        }

        // Add the custom email job to queue
        const job = await addEmailJob('custom_reminder', {
            userFilter,
            emailData: {
                subject,
                content,
                templateData
            }
        });

        res.json({
            success: true,
            message: 'Custom email job queued successfully',
            jobId: job.id
        });

    } catch (error) {
        console.error('Failed to queue custom email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to queue custom email',
            error: error.message
        });
    }
};

// Get user count for email preview
export const getUserCount = async (req, res) => {
    try {
        const { userFilter = {} } = req.body;

        const query = {
            isActive: true,
            isDeleted: false,
            emailVerified: true,
            ...userFilter
        };

        const count = await User.countDocuments(query);

        res.json({
            success: true,
            userCount: count,
            filter: userFilter
        });

    } catch (error) {
        console.error('Failed to get user count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user count',
            error: error.message
        });
    }
};

// Get job history
export const getJobHistory = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // Use the fallback-compatible getEmailJobHistory function
        const jobs = await getEmailJobHistory(parseInt(limit));

        res.json({
            success: true,
            jobs,
            count: jobs.length
        });

    } catch (error) {
        console.error('Failed to get job history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job history',
            error: error.message
        });
    }
};

// Manage scheduler tasks
export const manageScheduler = async (req, res) => {
    try {
        const { action, taskName } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action is required'
            });
        }

        switch (action) {
            case 'start_all':
                scheduler.startAll();
                break;
            case 'stop_all':
                scheduler.stopAll();
                break;
            case 'start_task':
                if (!taskName) {
                    return res.status(400).json({
                        success: false,
                        message: 'Task name is required for start_task action'
                    });
                }
                scheduler.startTask(taskName);
                break;
            case 'stop_task':
                if (!taskName) {
                    return res.status(400).json({
                        success: false,
                        message: 'Task name is required for stop_task action'
                    });
                }
                scheduler.stopTask(taskName);
                break;
            case 'status':
                scheduler.logActiveTasks();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Valid actions: start_all, stop_all, start_task, stop_task, status'
                });
        }

        res.json({
            success: true,
            message: `Scheduler action '${action}' executed successfully`
        });

    } catch (error) {
        console.error('Failed to manage scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to execute scheduler action',
            error: error.message
        });
    }
};

// Test email functionality
export const sendTestEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const userEmail = email || req.user?.email;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Send test email using the custom reminder job
        const job = await addEmailJob('custom_reminder', {
            userFilter: { email: userEmail },
            emailData: {
                subject: '🧪 Test Email - Email System Working!',
                content: 'This is a test email to verify that your email reminder system is working correctly.',
                templateData: {
                    title: 'Test Email',
                    actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
                    buttonText: 'Go to Dashboard'
                }
            }
        });

        res.json({
            success: true,
            message: `Test email queued for ${userEmail}`,
            jobId: job.id
        });

    } catch (error) {
        console.error('Failed to send test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
};

// Quick testing scheduler - runs jobs every few seconds
export const startQuickTestScheduler = async (req, res) => {
    try {
        const { intervalSeconds = 10 } = req.body;
        
        console.log(`Starting quick test scheduler (every ${intervalSeconds} seconds)`);
        
        // Clear any existing quick test interval
        if (global.quickTestInterval) {
            clearInterval(global.quickTestInterval);
        }
        
        // Start new interval
        global.quickTestInterval = setInterval(async () => {
            try {
                console.log('Quick test job triggered!');
                
                const job = await addEmailJob('daily_reminder', {
                    subject: '⚡ Quick Test - Daily Reminder',
                    content: `Quick test email sent at ${new Date().toLocaleTimeString()}`,
                    title: 'Quick Test Job',
                    actionUrl: 'http://localhost:3000/dashboard',
                    buttonText: 'Test Dashboard'
                });
                
                console.log(`Quick test job ${job.id} added to queue`);
                
            } catch (error) {
                console.error('Quick test job failed:', error);
            }
        }, intervalSeconds * 1000);
        
        res.json({
            success: true,
            message: `Quick test scheduler started (every ${intervalSeconds} seconds)`,
            intervalSeconds
        });
        
    } catch (error) {
        console.error('Failed to start quick test scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start quick test scheduler',
            error: error.message
        });
    }
};

// Stop quick testing scheduler
export const stopQuickTestScheduler = async (req, res) => {
    try {
        if (global.quickTestInterval) {
            clearInterval(global.quickTestInterval);
            global.quickTestInterval = null;
            console.log('Quick test scheduler stopped');
            
            res.json({
                success: true,
                message: 'Quick test scheduler stopped'
            });
        } else {
            res.json({
                success: false,
                message: 'Quick test scheduler is not running'
            });
        }
        
    } catch (error) {
        console.error('Failed to stop quick test scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop quick test scheduler',
            error: error.message
        });
    }
};

// DATABASE BACKUP MANAGEMENT ENDPOINTS

// Trigger manual database backup
export const createDatabaseBackup = async (req, res) => {
    try {
        const {
            compress = true,
            gzip = false,
            cleanup = true,
            backupName,
            collections
        } = req.body;

        console.log('Manual database backup requested');

        const job = await addEmailJob('database_backup', {
            compress,
            gzip,
            cleanup,
            backupName,
            collections,
            triggered: 'manual'
        });

        res.json({
            success: true,
            message: 'Database backup job started',
            jobId: job.id,
            options: { compress, gzip, cleanup }
        });

    } catch (error) {
        console.error('Failed to create database backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start database backup',
            error: error.message
        });
    }
};

// List all available backups
export const listDatabaseBackups = async (req, res) => {
    try {
        const backups = await listBackups();

        res.json({
            success: true,
            backups,
            count: backups.length
        });

    } catch (error) {
        console.error('Failed to list backups:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list backups',
            error: error.message
        });
    }
};

// Delete specific backup
export const deleteDatabaseBackup = async (req, res) => {
    try {
        const { backupName } = req.params;

        if (!backupName) {
            return res.status(400).json({
                success: false,
                message: 'Backup name is required'
            });
        }

        const result = await deleteBackup(backupName);

        if (result.success) {
            res.json({
                success: true,
                message: `Backup ${backupName} deleted successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete backup',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Failed to delete backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete backup',
            error: error.message
        });
    }
};

// Restore database from backup
export const restoreDatabaseBackup = async (req, res) => {
    try {
        const { backupName } = req.params;
        const { drop = false, gzip = false } = req.body;

        if (!backupName) {
            return res.status(400).json({
                success: false,
                message: 'Backup name is required'
            });
        }

        console.log(`Database restore requested: ${backupName}`);

        const result = await restoreBackup(backupName, { drop, gzip });

        if (result.success) {
            res.json({
                success: true,
                message: `Database restored from ${backupName}`,
                duration: Math.round(result.duration / 1000),
                timestamp: result.timestamp
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to restore database',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Failed to restore database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore database',
            error: error.message
        });
    }
};

// Get backup system status and configuration
export const getBackupStatus = async (req, res) => {
    try {
        const backups = await listBackups();
        const latestBackup = backups.length > 0 ? backups[0] : null;
        
        // Calculate total backup storage used
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        
        const status = {
            backupCount: backups.length,
            totalSizeBytes: totalSize,
            totalSizeFormatted: formatFileSize(totalSize),
            latestBackup: latestBackup ? {
                name: latestBackup.name,
                created: latestBackup.created,
                size: latestBackup.sizeFormatted
            } : null,
            configuration: {
                backupDirectory: process.env.BACKUP_DIR || './backups',
                retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
                schedule: process.env.DB_BACKUP_CRON || '0 2 * * *'
            }
        };

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('Failed to get backup status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get backup status',
            error: error.message
        });
    }
};

// Helper function to format file size
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}