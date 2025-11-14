// utils/databaseBackup.js - Simplified wrapper for JavaScript backup implementation
import fs from 'fs/promises';
import { createBackupJS, listBackupsJS, deleteBackupJS, restoreBackupJS } from './mongoBackup.js';

class DatabaseBackupManager {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || './backups';
    }

    // Initialize backup directory
    async initializeBackupDir() {
        try {
            await fs.access(this.backupDir);
            console.log('Backup directory exists:', this.backupDir);
        } catch (error) {
            console.log('Creating backup directory:', this.backupDir);
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log('Backup directory created successfully');
        }
    }

    // Perform MongoDB backup using JavaScript implementation
    async createDatabaseBackup(options = {}) {
        try {
            console.log('Starting database backup...');
            console.log('Using JavaScript backup implementation...');
            
            const backupOptions = {
                ...options,
                pretty: true // Make JSON readable
            };
            
            const result = await createBackupJS(backupOptions);
            
            if (result.success) {
                console.log('JavaScript backup completed successfully');
            }
            
            return result;
            
        } catch (error) {
            console.error('Database backup failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }



    // List all available JavaScript backups
    async listBackups() {
        try {
            await this.initializeBackupDir();
            
            // Get JavaScript backups
            const jsBackups = await listBackupsJS();
            
            // Sort by date (newest first)
            jsBackups.sort((a, b) => b.created - a.created);
            
            return jsBackups;
        } catch (error) {
            console.error('Failed to list backups:', error.message);
            return [];
        }
    }

    // Delete specific JavaScript backup
    async deleteBackup(backupName) {
        try {
            return await deleteBackupJS(backupName);
        } catch (error) {
            console.error('Failed to delete backup:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Restore database from JavaScript backup
    async restoreDatabase(backupName, options = {}) {
        try {
            console.log('Starting database restore from JavaScript backup...');
            return await restoreBackupJS(backupName, options);
        } catch (error) {
            console.error('Database restore failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
export const dbBackupManager = new DatabaseBackupManager();

// Convenience functions
export const createBackup = (options) => dbBackupManager.createDatabaseBackup(options);
export const listBackups = () => dbBackupManager.listBackups();
export const deleteBackup = (name) => dbBackupManager.deleteBackup(name);
export const restoreBackup = (name, options) => dbBackupManager.restoreDatabase(name, options);