// src/middlewares/googleStrategy.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config/env.js";
import User from '../modules/v1/user/user.model.js';

passport.use(
    new GoogleStrategy(
        {
        clientID: config.oauth.googleClientId,
        clientSecret: config.oauth.googleClientSecret,  // Fixed: was googleSecret
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback",
        },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account has no email"), null);

        let user = await User.findOne({ email });

        // CASE A: New user (no account with this email)
        if (!user) {
          const [firstname, ...rest] = profile.displayName.split(" ");
          const lastname = rest.join(" ") || "";
          const username = email.split("@")[0];

          user = await User.create({
            firstname,
            lastname,
            username,
            email,
            googleId: profile.id,
            provider: "google",
            emailVerified: true,
            profileImageUrl: profile.photos?.[0]?.value || null,
          });
          return done(null, user);
        }

        // CASE B: Existing user, already linked with Google
        if (user.googleId) {
          return done(null, user);
        }

        // CASE C: Existing local user trying Google for first time → link accounts
        user.googleId = profile.id;
        user.provider = "google";
        user.emailVerified = true;
        await user.save();

        return done(null, user);
      } catch (err) {
        console.error("Google strategy error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
