// models/kycDetails.model.js

import mongoose from "mongoose";

const kycDetailsSchema = new mongoose.Schema(
    {
        user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        },

        fullName: {
        type: String,
        required: true,
        },

        dateOfBirth: {
        type: Date,
        required: true,
        },

        gender: {
        type: String,
        enum: ["male", "female", "other"],
        },

        nationality: {
        type: String,
        },

        address: {
        country: String,
        state: String,
        city: String,
        zipCode: String,
        street: String,
        },

        idType: {
        type: String,
        enum: ["passport", "national_id", "driver_license"],
        required: true,
        },

        idNumber: {
        type: String,
        required: true,
        },

        idImageUrl: {
        type: String,
        },

        selfieImageUrl: {
        type: String,
        },

        status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
        },

        rejectionReason: {
        type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("KycDetails", kycDetailsSchema);
