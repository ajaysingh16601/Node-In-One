import Joi from 'joi';

export default class UserValidator {
    static updateProfileSchema = {
        body: Joi.object({
        firstname: Joi.string().min(2).max(50),
        lastname: Joi.string().min(2).max(50),
        username: Joi.string().alphanum().min(3).max(30),
        phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
        profileImageUrl: Joi.string().uri(),
        }),
    };
}
