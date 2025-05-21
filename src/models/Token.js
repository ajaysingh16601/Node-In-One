import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        refreshToken: { type: String, required: true, unique: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

export default mongoose.model('Token', tokenSchema);
