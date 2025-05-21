import mongoose from 'mongoose';

const tokenStoreSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    token: { type: String, required: true },
    type: {
        type: String,
        enum: ['access', 'refresh'],
        required: true,
    },

    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
});

tokenStoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TokenStore', tokenStoreSchema);
