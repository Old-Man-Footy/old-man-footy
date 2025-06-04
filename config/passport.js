const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() }).populate('clubId');
        
        if (!user) {
            return done(null, false, { message: 'No user found with that email address.' });
        }

        if (!user.isActive) {
            return done(null, false, { message: 'Account is not active. Please complete your registration.' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Password incorrect.' });
        }
    } catch (error) {
        return done(error);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).populate('clubId');
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;