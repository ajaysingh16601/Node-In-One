import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
} from './user.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { validate } from '../../../middlewares/validate.js';
import { updateProfileSchema } from './user.validator.js';

const router = express.Router();

router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateUserProfile);
router.delete('/account', authenticate, deleteUserAccount);

export default router;
