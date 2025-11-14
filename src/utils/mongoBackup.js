// utils/mongoBackup.js
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/env.js';

class MongoBackupManager {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || './backups';
        this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7');
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

    // Generate backup filename with timestamp
    generateBackupFilename(prefix = 'mongodb_backup') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}_${timestamp}.json`;
    }

    // Get all collections from database
    async getAllCollections() {
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            return collections.map(col => col.name).filter(name => !name.startsWith('system.'));
        } catch (error) {
            console.error('Failed to get collections:', error);
            return [];
        }
    }

    // Backup single collection
    async backupCollection(collectionName) {
        try {
            const db = mongoose.connection.db;
            const collection = db.collection(collectionName);
            
            // Get all documents
            const documents = await collection.find({}).toArray();
            
            // Get collection stats (using collStats command)
            let stats;
            try {
                stats = await db.command({ collStats: collectionName });
            } catch (error) {
                stats = { 
                    count: documents.length,
                    size: 0,
                    avgObjSize: 0,
                    storageSize: 0,
                    indexSizes: {}
                };
            }
            
            return {
                collectionName,
                documentCount: documents.length,
                documents,
                stats: {
                    count: stats.count || documents.length,
                    size: stats.size || 0,
                    avgObjSize: stats.avgObjSize || 0,
                    storageSize: stats.storageSize || 0,
                    indexCount: stats.nindexes || 0
                },
                indexes: await collection.listIndexes().toArray().catch(() => [])
            };
        } catch (error) {
            console.error(`Failed to backup collection ${collectionName}:`, error);
            // Try to at least get document count
            let docCount = 0;
            try {
                docCount = await collection.countDocuments();
            } catch (countError) {
                console.warn(`Could not count documents in ${collectionName}`);
            }
            
            return {
                collectionName,
                error: error.message,
                documentCount: docCount,
                documents: [],
                stats: { count: docCount, size: 0 },
                indexes: []
            };
        }
    }

    // Create full database backup
    async createDatabaseBackup(options = {}) {
        const startTime = Date.now();
        const backupName = options.backupName || this.generateBackupFilename();
        const backupPath = path.join(this.backupDir, backupName);

        try {
            // Ensure backup directory exists
            await this.initializeBackupDir();

            // Check MongoDB connection
            if (mongoose.connection.readyState !== 1) {
                throw new Error('MongoDB connection not established');
            }

            // Get all collections
            const collectionNames = await this.getAllCollections();
            console.log(`Found ${collectionNames.length} collections to backup`);

            if (collectionNames.length === 0) {
                throw new Error('No collections found in database');
            }

            // Backup each collection
            const backupData = {
                metadata: {
                    backupName,
                    timestamp: new Date().toISOString(),
                    databaseName: mongoose.connection.db.databaseName,
                    mongoVersion: mongoose.version,
                    nodeVersion: process.version,
                    totalCollections: collectionNames.length
                },
                collections: {}
            };

            let totalDocuments = 0;
            let totalSize = 0;

            for (const collectionName of collectionNames) {
                console.log(`Backing up collection: ${collectionName}`);
                
                const collectionBackup = await this.backupCollection(collectionName);
                backupData.collections[collectionName] = collectionBackup;
                
                totalDocuments += collectionBackup.documentCount;
                totalSize += collectionBackup.stats.size;
                
                console.log(`${collectionName}: ${collectionBackup.documentCount} documents`);
            }

            // Update metadata
            backupData.metadata.totalDocuments = totalDocuments;
            backupData.metadata.totalSize = totalSize;
            backupData.metadata.totalSizeFormatted = this.formatFileSize(totalSize);

            // Write backup to file
            const backupJson = JSON.stringify(backupData, null, options.pretty ? 2 : 0);
            await fs.writeFile(backupPath, backupJson, 'utf8');

            // Get file stats
            const fileStats = await fs.stat(backupPath);
            const duration = Date.now() - startTime;

            // Clean old backups
            if (options.cleanup !== false) {
                await this.cleanOldBackups();
            }

            return {
                success: true,
                backupName,
                backupPath,
                duration,
                stats: {
                    collections: collectionNames.length,
                    documents: totalDocuments,
                    sizeBytes: fileStats.size,
                    sizeFormatted: this.formatFileSize(fileStats.size),
                    databaseSize: totalSize,
                    databaseSizeFormatted: this.formatFileSize(totalSize)
                },
                timestamp: backupData.metadata.timestamp
            };

        } catch (error) {
            const duration = Date.now() - startTime;            
            return {
                success: false,
                error: error.message,
                duration,
                backupName,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Restore database from backup
    async restoreDatabase(backupName, options = {}) {
        const startTime = Date.now();
        
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            // Check if backup exists
            await fs.access(backupPath);
            // Read backup file
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const backupData = JSON.parse(backupContent);
            
            if (!backupData.collections) {
                throw new Error('Invalid backup format: collections not found');
            }

            // Check MongoDB connection
            if (mongoose.connection.readyState !== 1) {
                throw new Error('MongoDB connection not established');
            }

            const db = mongoose.connection.db;
            let restoredCollections = 0;
            let restoredDocuments = 0;

            // Restore each collection
            for (const [collectionName, collectionData] of Object.entries(backupData.collections)) {
                if (collectionData.error) {
                    continue;
                }

                const collection = db.collection(collectionName);
                
                // Drop existing collection if requested
                if (options.drop) {
                    try {
                        await collection.drop();
                    } catch (error) {
                        // Collection might not exist
                        console.log(`Collection ${collectionName} did not exist`);
                    }
                }

                // Insert documents if any exist
                if (collectionData.documents && collectionData.documents.length > 0) {
                    await collection.insertMany(collectionData.documents, { ordered: false });
                    restoredDocuments += collectionData.documents.length;
                }

                // Recreate indexes
                if (collectionData.indexes && collectionData.indexes.length > 0) {
                    const indexesToCreate = collectionData.indexes.filter(idx => idx.name !== '_id_');
                    if (indexesToCreate.length > 0) {
                        try {
                            await collection.createIndexes(indexesToCreate);
                            console.log(`Recreated ${indexesToCreate.length} indexes for ${collectionName}`);
                        } catch (error) {
                            console.warn(`Failed to recreate indexes for ${collectionName}:`, error.message);
                        }
                    }
                }

                restoredCollections++;
                console.log(`${collectionName}: ${collectionData.documents.length} documents restored`);
            }

            const duration = Date.now() - startTime;
            
            return {
                success: true,
                duration,
                stats: {
                    collections: restoredCollections,
                    documents: restoredDocuments
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('database restore failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                duration,
                timestamp: new Date().toISOString()
            };
        }
    }

    // List all available backups
    async listBackups() {
        try {
            await this.initializeBackupDir();
            const files = await fs.readdir(this.backupDir);
            
            const backups = [];
            
            for (const file of files) {
                if (file.startsWith('mongodb_backup') && file.endsWith('.json')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Try to read metadata
                    let metadata = null;
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        const data = JSON.parse(content);
                        metadata = data.metadata;
                    } catch (error) {
                        console.warn(`Could not read metadata from ${file}`);
                    }
                    
                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        sizeFormatted: this.formatFileSize(stats.size),
                        created: stats.birthtime,
                        modified: stats.mtime,
                        metadata: metadata
                    });
                }
            }
            
            // Sort by creation date (newest first)
            backups.sort((a, b) => b.created - a.created);
            
            return backups;
        } catch (error) {
            console.error('Failed to list backups:', error.message);
            return [];
        }
    }

    // Delete specific backup
    async deleteBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            await fs.unlink(backupPath);
            
            return { success: true };
            
        } catch (error) {
            console.error('Failed to delete backup:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Clean old backups based on retention policy
    async cleanOldBackups() {
        try {            
            const files = await fs.readdir(this.backupDir);
            const cutoffDate = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (file.startsWith('mongodb_backup') && file.endsWith('.json')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        console.log('Deleted old backup:', file);
                    }
                }
            }
            
            console.log(`Cleaned ${deletedCount} old backup(s)`);
            return { deleted: deletedCount };
            
        } catch (error) {
            console.warn('Backup cleanup failed:', error.message);
            return { error: error.message };
        }
    }

    // Format file size in human readable format
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}

// Export singleton instance
export const mongoBackupManager = new MongoBackupManager();

// Convenience functions
export const createBackupJS = (options) => mongoBackupManager.createDatabaseBackup(options);
export const listBackupsJS = () => mongoBackupManager.listBackups();
export const deleteBackupJS = (name) => mongoBackupManager.deleteBackup(name);
export const restoreBackupJS = (name, options) => mongoBackupManager.restoreDatabase(name, options);