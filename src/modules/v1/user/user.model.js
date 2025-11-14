import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            required: true,
        },
        lastname: {
            type: String,
            default: null,
        },
        username: {
            type: String,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
            lowercase: true,
            required: true,
            index: true,
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
        },
        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
        },
        googleId: {
            type: String,
            default: null,
        },
        provider: { type: String, enum: ["local", "google"], default: "local" },
        emailVerified: { type: Boolean, default: false },
        phoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },
        role: {
            type: String,
            enum: ["user", "admin", "moderator"],
            default: "user",
        },
        isActive: { type: Boolean, default: true },
        kycStatus: {
        type: String,
            enum: ["not_submitted", "pending", "verified", "rejected"],
            default: "not_submitted",
        },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        lastLoginAt: { type: Date, default: null },
        kycDetails: { type: mongoose.Schema.Types.ObjectId, ref: "KycDetails", default: null },
        profileImageUrl: { type: String, default: null },
        lastSeen: { type: Date, default: Date.now },
        bio: { type: String, maxlength: 500, default: "" },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
