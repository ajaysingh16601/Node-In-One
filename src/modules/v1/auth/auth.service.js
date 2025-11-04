// auth.service.js
import User from '../user/user.model.js';
import { hashPassword, comparePassword } from '../../../utils/hash.js';
import { generateToken } from '../../../utils/token.js';
import Otp from '../../../models/Otp.js';
import crypto from 'crypto';
// import { sendEmail } from '../../../utils/email.js';

// register
export const registerUser = async ({ email, password, username, firstname, lastname}) => {
    const exists = await User.findOne({ email });
    if (exists) throw new Error('Email already in use');
// i want to update emailVerified=true

    const hashed = await hashPassword(password);
    const user = await User.create({ email, password: hashed, username, firstname, lastname,emailVerified: true });

    const tokens = await generateToken(user._id);
    return { user, tokens };
};

export const checkUserExists = async (email) => {
    const user = await User.findOne({ email });
    return !!user;
};

export const checkUserDetailsExists = async (email) => {
    const user = await User.findOne({ email });
    return user;
};
// login
export const handleLogin = async (email, password) => {
    // Validate input parameters
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if(user.isDeleted) throw new Error('This account has been deleted. Would you like to restore it?');

    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
        throw new Error('This account was created with Google. Please use Google Sign-In or set a password first.');
    }

    // Validate password parameters before bcrypt comparison
    if (!password || !user.password) {
        throw new Error('Invalid credentials - missing password data');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    await Otp.deleteMany({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const secret = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({ email, otp, secret, expiresAt,type:'login' });
    // await sendEmail(email, `Your login OTP: ${otp}`);

    return { message: 'OTP sent to your email', secret , otp};
};

export const verifyOtpAndLogin = async (email, otp, secret) => {
    const record = await Otp.findOne({ email, secret });
    if (!record) throw new Error('Invalid secret or email');
    if (record.otp !== otp) throw new Error('Invalid OTP');
    if (record.expiresAt < new Date()) throw new Error('OTP expired');

    await record.deleteOne();
    const user = await User.findOne({ email }).select("-password");
    const tokens = await generateToken(user._id);

    return { user, tokens };
};

// forgot password
export const updateUserPassword = async (email, newPassword) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    await user.save();
};

export const changeUserPassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    await user.save();
};