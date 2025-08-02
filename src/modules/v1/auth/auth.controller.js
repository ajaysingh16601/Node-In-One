// auth.controller.js
import * as OtpService from '../../../services/otp.service.js';
import * as AuthService from './auth.service.js';
import { generateJwtToken, generateToken, verifyToken } from '../../../utils/token.js';
import jwt from 'jsonwebtoken';
import TokenStore from '../../../models/TokenStore.js';
// Register

// Step 1: Request OTP for Registration
export const requestOtp = async (req, res) => {
  const { email } = req.body;
  const userExists = await AuthService.checkUserExists(email);

  if (userExists) return res.status(400).json({ message: 'User already registered' });

  const result = await OtpService.requestOtp(email,'register');
  res.json(result);
};

// Step 2: Verify OTP and return registration token
export const verifyOtp = async (req, res) => {
  const { email, otp, secret } = req.body;
  await OtpService.verifyOtp({ email, otp, secret, type: 'register' });

  const registrationToken = generateJwtToken({ userId: email }, '10m');
  res.json({ registrationToken });
};

// Step 3: Register user
export const register = async (req, res) => {
  const { username, password, registrationToken, firstname, lastname } = req.body;

  let email;
  try {
    const decoded = verifyToken(registrationToken);
    email = decoded.userId; // we passed email in token
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired registration token' });
  }

  const result = await AuthService.registerUser({ username, email, password, firstname, lastname  });
  res.status(201).json(result);
};

// Login
// Step 1: Request OTP for Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await AuthService.handleLogin(email, password);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

// Step 2: Verify OTP and login
export const verifyLoginOtp = async (req, res) => {
  const { email, otp, secret } = req.body;
  try {
    const result = await AuthService.verifyOtpAndLogin(email, otp, secret);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required' });

  try {
    const decoded = verifyToken(refreshToken, true);
    const newTokens = generateToken(decoded.userId);
    res.status(200).json(newTokens);
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// Forgot password
// Step 1: Request OTP for Forgot Password
export const requestForgotOtp = async (req, res) => {
  const { email } = req.body;

  const exists = await AuthService.checkUserExists(email);
  if (!exists) return res.status(404).json({ message: 'User not found' });

  try {
    const result = await OtpService.requestOtp(email, 'reset');
    res.json({ message: 'OTP sent to your email', secret: result.secret });
  } catch (err) {
    res.status(429).json({ message: err.message });
  }
};

// Step 2: Verify OTP and return reset token
export const verifyForgotOtp = async (req, res) => {
  const { email, otp, secret } = req.body;

  try {
    await OtpService.verifyOtp({ email, otp, secret, type: 'reset' });
    const resetToken = generateToken(email, '15m'); // email passed as userId
    res.json({ resetToken });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Step 3: Reset password
export const resetPassword = async (req, res) => {

  const { newPassword, resetToken } = req.body;

  let email;
  try {
    const decoded = verifyToken(resetToken);
    email = decoded.userId;
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired reset token' });
  }

  try {
    await AuthService.updateUserPassword(email, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Change password
export const changePassword = async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    try {
        await AuthService.changeUserPassword(userId, currentPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Logout
export const logoutController = async (req, res) => {
  const { refreshToken } = req.body;
  const authHeader = req.headers.authorization;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const deletedRefresh = await TokenStore.findOneAndDelete({ token: refreshToken, type: 'refresh' });
if (!deletedRefresh) {
  return res.status(200).json({ message: 'Already logged out or refresh token not found.' }); 
  // message = 'Already logged out or refresh token not found.';
}

    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      const decoded = jwt.decode(accessToken);

      if (decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await TokenStore.create({
          token: accessToken,
          type: 'access',
          expiresAt,
        });
      }
    }

    return res.status(200).json({ message: 'Logout successful. Tokens invalidated.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// OAuth
export const issueJWTForGoogleUser = async (req, res, next) => {
  try {
    const user = req.user;
    const tokens = await generateToken(user._id);

    res.status(200).json({ user, tokens });
  } catch (err) {
    next(err);
  }
};
