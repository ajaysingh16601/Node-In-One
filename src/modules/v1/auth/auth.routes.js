// src/modules/v1/auth/auth.routes.js
import express from 'express';
import { changePassword, issueJWTForGoogleUser, login, logoutController, refreshToken, register, requestForgotOtp, requestOtp, resetPassword, verifyForgotOtp, verifyLoginOtp, verifyOtp} from './auth.controller.js';
import { validate } from '../../../middlewares/validate.js';
import { changePasswordSchema, loginValidation, otpVerifyValidation, registerSchema, resetPasswordSchema } from './auth.validator.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { sendTestSMS } from '../../../controllers/sms.controller.js';
import { validateLogout } from '../../../middlewares/validateLogout.js';
import passport from 'passport';
import { generateToken } from '../../../utils/token.js';

const router = express.Router();

//regiter
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/register',validate(registerSchema), register);
// login
router.post('/login', validate(loginValidation), login);
router.post('/login/verify', validate(otpVerifyValidation), verifyLoginOtp);
// refreshtoken
router.post('/refresh', refreshToken);
// forgot-password
router.post('/forgot-password/request', requestForgotOtp);
router.post('/forgot-password/verify', verifyForgotOtp);
router.post('/forgot-password/reset',validate(resetPasswordSchema) ,resetPassword);
// change-password
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
// sms 
router.post('/send-test-sms', sendTestSMS);

// logout
router.post('/logout', validateLogout, logoutController);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Google authentication failed" });

      const tokens = await generateToken(user._id);

      // Send data to opener (popup) for frontend to receive
      const script = `
        <script>
          window.opener.postMessage(
            {
              type: 'google-login-success',
              payload: ${JSON.stringify({ user, tokens })}
            },
            'http://localhost:5173/login'
          );
          window.close();
        </script>
      `;
      res.send(script);
    } catch (err) {
      console.error('Google login error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;
