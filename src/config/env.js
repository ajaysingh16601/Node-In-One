import dotenv from 'dotenv';
import awsConfig from './awsConfig.js';

dotenv.config();

class ConfigManager {
  constructor() {
    this.configCache = null;
    this.isInitialized = false;
  }

  async initializeConfig() {
    if (this.isInitialized && this.configCache) {
      return this.configCache;
    }

    try {
      // Load JWT secrets from S3
      const [jwtSecret, jwtRefreshSecret] = await Promise.all([
        awsConfig.getJWTSecret(),
        awsConfig.getJWTRefreshSecret()
      ]);

      this.configCache = {
        port: process.env.PORT || 5000,
        jwt: {
          secret: jwtSecret,
          refreshSecret: jwtRefreshSecret,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2h',
        },
        devSecret: process.env.DEV_SECRET,
        dbUri: process.env.MONGODB_URI,
        oauth: {
          googleClientId: process.env.GOOGLE_CLIENT_ID,
          googleSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        email: {
          user: process.env.SENDGRID_API_KEY,
          pass: process.env.SENDGRID_VERIFIED_SENDER,
        },
        twillio: {
          sid: process.env.TWILIO_SID,
          token: process.env.TWILLIO_AUTH_TOKEN,
          phone: process.env.TWILIO_PHONE,    
          server: process.env.TWILIO_Server,   // smtp.sendgrid.net
          port: process.env.TWILIO_Ports,      // 587
          username: process.env.TWILIO_Username, // "apikey"
          password: process.env.TWILIO_Password, // SENDGRID_API_KEY
        },
        emailjs: {
          serviceId: process.env.EMAILJS_SERVICE_ID,
          templateId: process.env.EMAILJS_TEMPLATE_ID,
          publicKey: process.env.EMAILJS_PUBLIC_KEY,
        },
      };

      this.isInitialized = true;
      console.log('Configuration initialized with S3 secrets');
      return this.configCache;

    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      
      // Fallback to environment variables
      console.log('Falling back to environment variables');
      this.configCache = {
        port: process.env.PORT || 5000,
        jwt: {
          secret: process.env.JWT_SECRET,
          refreshSecret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2h',
        },
        devSecret: process.env.DEV_SECRET,
        dbUri: process.env.MONGODB_URI,
        oauth: {
          googleClientId: process.env.GOOGLE_CLIENT_ID,
          googleSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        email: {
          user: process.env.SENDGRID_API_KEY,
          pass: process.env.SENDGRID_VERIFIED_SENDER,
        },
        twillio: {
          sid: process.env.TWILIO_SID,
          token: process.env.TWILLIO_AUTH_TOKEN,
          phone: process.env.TWILIO_PHONE
        }
      };

      this.isInitialized = true;
      return this.configCache;
    }
  }

  async getConfig() {
    if (!this.isInitialized) {
      await this.initializeConfig();
    }
    return this.configCache;
  }

  // Force refresh configuration (useful for key rotation)
  async refreshConfig() {
    awsConfig.clearCache();
    this.configCache = null;
    this.isInitialized = false;
    return await this.initializeConfig();
  }

  // Get specific config section
  async getJWTConfig() {
    const config = await this.getConfig();
    return config.jwt;
  }

  async getDBConfig() {
    const config = await this.getConfig();
    return config.dbUri;
  }

  async getOAuthConfig() {
    const config = await this.getConfig();
    return config.oauth;
  }
}

// Create singleton instance
const configManager = new ConfigManager();

// Export the config getter function
export const getConfig = () => configManager.getConfig();

// Export specific config getters
export const getJWTConfig = () => configManager.getJWTConfig();
export const getDBConfig = () => configManager.getDBConfig();
export const getOAuthConfig = () => configManager.getOAuthConfig();

// Export refresh function
export const refreshConfig = () => configManager.refreshConfig();

// For backward compatibility, export config object (but it needs to be awaited)
export const config = await configManager.initializeConfig();

export default configManager;