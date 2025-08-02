import express from 'express';
import UserController from './user.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { validate } from '../../../middlewares/validate.js';
import UserValidator from './user.validator.js';

const router = express.Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, validate(UserValidator.updateProfileSchema), UserController.updateProfile);
router.delete('/account', authenticate, UserController.deleteUserAccount);

export default router;
