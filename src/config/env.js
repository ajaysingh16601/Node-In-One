import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '1h',
    refreshExpiresIn: '2h',
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
  twillio:{
    sid: process.env.TWILIO_SID,
    token: process.env.TWILLIO_AUTH_TOKEN,
    phone: process.env.TWILIO_PHONE
  }
};
