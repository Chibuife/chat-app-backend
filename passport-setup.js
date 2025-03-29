const passport = require('passport');
const User = require('./model/User');
require('dotenv').config();
const FacebookStrategy = require('passport-facebook').Strategy;


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: 'http://localhost:8080/api/v1/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email'],
    scope: ['email']
},
    async function (accessToken, refreshToken, profile, done) {
        // Replace User.findOrCreate with your user management logic
        try {
            const email = profile.emails[0].value
            let user = await User.findOne({ email })
            console.log(user, 'user')
            if (!user) {
                user = new User({
                    facebookId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value
                });
                await user.save();
            } else {
                console.log('User found:', user);
            }
            return done(null, user);
        } catch (err) {
            console.error('Error in FacebookStrategy:', err);
            return done(err, null);
        }
    }));

passport.serializeUser((user, done) => {
    const id = user.user?._id || user?._id
    console.log(id, 'id')
    done(null, id);
});

passport.deserializeUser(async (id, done) => {
    console.log('Deserializing user ID:', id);
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});