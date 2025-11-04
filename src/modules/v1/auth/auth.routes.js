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
      if (!user) {
        console.error('Google authentication failed: No user returned');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
      }

      const tokens = await generateToken(user._id);

      // More secure postMessage with origin validation
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const script = `
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: 'google-login-success',
                  payload: ${JSON.stringify({ user, tokens })}
                },
                '${frontendUrl}'
              );
              window.close();
            } else {
              // Fallback: redirect to frontend with tokens in URL (less secure)
              window.location.href = '${frontendUrl}/login?success=true&token=${tokens.accessToken}';
            }
          } catch (error) {
            console.error('PostMessage error:', error);
            window.location.href = '${frontendUrl}/login?error=postmessage_failed';
          }
        </script>
      `;
      res.send(script);
    } catch (err) {
      console.error('Google login error:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=server_error`);
    }
  }
);

export default router;
