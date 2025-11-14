import express from 'express';
import UserController from './user.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { validate } from '../../../middlewares/validate.js';
import UserValidator from './user.validator.js';

const router = express.Router();

router.use(authenticate);
router.get('/profile', UserController.getProfile);
router.put('/profile', validate(UserValidator.updateProfileSchema), UserController.updateProfile);
router.delete('/account', UserController.deleteUserAccount);
router.get('/list', UserController.listUsers);
// kyc details api will be added here later

export default router;
