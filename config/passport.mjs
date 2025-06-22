import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { User, Club } from '../models/index.mjs';

passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ 
                where: { 
                    email: email.toLowerCase(),
                    isActive: true 
                },
                include: [{
                    model: Club,
                    as: 'club'
                }]
            });
            
            if (!user) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            
            if (!isValidPassword) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            // Update lastLoginAt timestamp for successful login
            await user.update({ 
                lastLoginAt: new Date() 
            });

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id, {
            include: [{
                model: Club,
                as: 'club'
            }]
        });
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport;