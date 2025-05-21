// models/Otp.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  secret: String,
  expiresAt: Date,
  type: { type: String, enum: ['register', 'login', 'reset'], required: true }
}, { timestamps: true });

export default mongoose.model('Otp', otpSchema);
