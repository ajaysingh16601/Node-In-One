import mongoose from 'mongoose';
import User from '../models/User.js';
import { config } from '../config/env.js';

// Optional: If using bcrypt for hashing passwords
import bcrypt from 'bcrypt';

await mongoose.connect(config.dbUri);

// Hash passwords
const password1 = await bcrypt.hash('Password123!', 10);
const password2 = await bcrypt.hash('AdminPass456!', 10);
const password3 = await bcrypt.hash('UserPass789!', 10);

await User.create([
    {
        firstname: 'Alice',
        lastname: 'Johnson',
        username: 'alicej',
        email: 'alice@example.com',
        phone: '+12345678901',
        password: password1,
        emailVerified: true,
        phoneVerified: true,
        role: 'user',
        kycStatus: 'verified',
        lastLoginAt: new Date(),
        profileImageUrl: 'https://example.com/images/alice.jpg',
    },
    {
        firstname: 'Bob',
        lastname: 'Smith',
        username: 'bobsmith',
        email: 'bob@example.com',
        phone: '+19876543210',
        password: password2,
        emailVerified: true,
        phoneVerified: false,
        role: 'admin',
        kycStatus: 'pending',
        twoFactorEnabled: true,
        lastLoginAt: new Date(),
        profileImageUrl: 'https://example.com/images/bob.jpg',
    },
    {
        firstname: 'Charlie',
        lastname: 'Brown',
        username: 'charlieb',
        email: 'charlie@example.com',
        password: password3,
        emailVerified: false,
        phoneVerified: false,
        role: 'moderator',
        kycStatus: 'rejected',
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
        lastLoginAt: new Date(),
        profileImageUrl: 'https://example.com/images/charlie.jpg',
    },
    {
        firstname: 'Dana',
        lastname: 'Lopez',
        username: 'dlopez',
        email: 'dana@example.com',
        googleId: 'google-oauth2|123456789012345678901',
        emailVerified: true,
        role: 'user',
        kycStatus: 'not_submitted',
        lastLoginAt: new Date(),
        profileImageUrl: 'https://example.com/images/dana.jpg',
    },
]);

console.log('Seeded');
process.exit(0);
