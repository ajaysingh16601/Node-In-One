import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

class AWSConfig {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.S3_BUCKET_NAME;
    this.jwtSecretKey = process.env.JWT_SECRET_S3_KEY;
    this.jwtRefreshSecretKey = process.env.JWT_SECRET_S3_KEY;
    
    // Cache for secrets
    this.secretsCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
  }

  async getSecretFromS3(s3Key) {
    try {
      // Check cache first
      if (this.isSecretCached(s3Key)) {
        return this.secretsCache.get(s3Key);
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to string
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      const secret = Buffer.concat(chunks).toString('utf-8').trim();
      
      // Cache the secret
      this.cacheSecret(s3Key, secret);
      
      return secret;
    } catch (error) {
      console.error(`Error fetching secret ${s3Key} from S3:`, error);
      
      // Fallback to environment variables if S3 fails
      if (s3Key === this.jwtSecretKey) {
        console.warn('Falling back to JWT_SECRET from environment variables');
        return process.env.JWT_SECRET;
      }
      
      if (s3Key === this.jwtRefreshSecretKey) {
        console.warn('Falling back to JWT_REFRESH_SECRET from environment variables');
        return process.env.JWT_REFRESH_SECRET;
      }
      
      throw new Error(`Failed to retrieve secret: ${s3Key}`);
    }
  }

  isSecretCached(key) {
    return this.secretsCache.has(key) && 
           this.cacheExpiry.has(key) && 
           Date.now() < this.cacheExpiry.get(key);
  }

  cacheSecret(key, secret) {
    this.secretsCache.set(key, secret);
    this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
  }

  async getJWTSecret() {
    try {
      return await this.getSecretFromS3(this.jwtSecretKey);
    } catch (error) {
      console.error('Failed to get JWT secret:', error);
      throw error;
    }
  }

  async getJWTRefreshSecret() {
    try {
      return await this.getSecretFromS3(this.jwtRefreshSecretKey);
    } catch (error) {
      console.error('Failed to get JWT refresh secret:', error);
      throw error;
    }
  }

  // Clear cache (useful for key rotation)
  clearCache() {
    this.secretsCache.clear();
    this.cacheExpiry.clear();
    console.log('AWS secrets cache cleared');
  }

  // Warm up cache by pre-loading secrets
  async warmupCache() {
    try {
      console.log('Warming up AWS secrets cache...');
      await Promise.all([
        this.getJWTSecret(),
        this.getJWTRefreshSecret()
      ]);
      console.log('AWS secrets cache warmed up successfully');
    } catch (error) {
      console.error('Failed to warm up secrets cache:', error);
      throw error;
    }
  }

  // Health check for AWS connection
  async healthCheck() {
    try {
      await this.getJWTSecret();
      return { status: 'healthy', message: 'AWS S3 connection successful' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// Create singleton instance
const awsConfig = new AWSConfig();

export default awsConfig;