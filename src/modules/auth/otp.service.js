import Otp from '../../models/Otp.js';
import crypto from 'crypto';
import { sendEmail } from '../../utils/email.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const requestOtp = async (email, type) => {

  const allowed = checkRateLimit(email, type);
  if (!allowed) throw new Error('Too many OTP requests. Please try again later.');

  await Otp.deleteMany({ email, type });

  const otp = generateOtp();
  const secret = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.create({ email, otp, secret, expiresAt, type });
  await sendEmail(email, `Your ${type} OTP: ${otp}`);

  return { secret, otp };
};


export const verifyOtp = async ({ email, otp, secret, type }) => {

  const record = await Otp.findOne({ email, secret, type });
  if (!record) throw new Error('Invalid OTP details');
  if (record.otp !== otp) throw new Error('Invalid OTP');
  if (record.expiresAt < new Date()) throw new Error('OTP expired');

  await record.deleteOne();
  return true;
};
