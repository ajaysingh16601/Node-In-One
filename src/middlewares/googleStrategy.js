import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config/env.js";
import User from "../models/User.js";

passport.use(
    new GoogleStrategy(
        {
        clientID: config.oauth.googleClientId,
        clientSecret: config.oauth.googleSecret,
        callbackURL: "http://localhost:5000/api/v1/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            let user = await User.findOne({ email });

            if (!user) {
            user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
            });
            } else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            }

            return done(null, user);
        } catch (err) {
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
