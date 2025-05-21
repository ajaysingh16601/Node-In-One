import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(6).required(),
    registrationToken: Joi.string().required(),
    role: Joi.string().valid('user', 'admin').default('user'),
});

export const loginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

export const otpVerifyValidation = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    secret: Joi.string().required()
});

export const resetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
    resetToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ 'any.only': 'New password and confirmation do not match' }),
});
