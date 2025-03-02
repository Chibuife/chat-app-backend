const express = require('express');
const router = express.Router();
require('dotenv').config();


const { login, signup, verify, forgottenpassword, passwordreset, logout, googleCallBack, facebookCallBack } = require('../contollers/auth');
const passport = require('passport');

router.post('/login', login)
router.post('/signup', signup)
router.get('/verify/:token', verify)
router.post('/forgotten-password', forgottenpassword)
router.put('/reset-password', passwordreset)

// router.post('/make-admin', makeAdmin)
router.get('/logout', logout)


// google auth 
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    googleCallBack
)
router.get('/google',
    passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'email'] }));



// facebook auth 
router.get('/facebook',
    passport.authenticate('facebook'));

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    facebookCallBack
 );

module.exports = router

