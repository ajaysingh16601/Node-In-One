// routes/v1/jobRoutes.js
import express from 'express';
import {
    getJobStats,
    triggerJob,
    sendCustomEmail,
    getUserCount,
    getJobHistory,
    manageScheduler,
    sendTestEmail,
    startQuickTestScheduler,
    stopQuickTestScheduler,
    createDatabaseBackup,
    listDatabaseBackups,
    deleteDatabaseBackup,
    restoreDatabaseBackup,
    getBackupStatus
} from '../../controllers/jobController.js';

const router = express.Router();

// Get job queue statistics
router.get('/stats', getJobStats);

// Get job history
router.get('/history', getJobHistory);

// Trigger a job immediately
router.post('/trigger', triggerJob);

// Send custom email to users
router.post('/send-custom-email', sendCustomEmail);

// Get user count for email preview
router.post('/user-count', getUserCount);

// Manage scheduler (start/stop tasks)
router.post('/scheduler', manageScheduler);

// Send test email
router.post('/test-email', sendTestEmail);

// Quick testing routes
router.post('/quick-test/start', startQuickTestScheduler);
router.post('/quick-test/stop', stopQuickTestScheduler);

// Database backup routes
router.post('/backup/create', createDatabaseBackup);
router.get('/backup/list', listDatabaseBackups);
router.get('/backup/status', getBackupStatus);
router.delete('/backup/:backupName', deleteDatabaseBackup);
router.post('/backup/:backupName/restore', restoreDatabaseBackup);

export default router;