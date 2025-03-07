const express = require('express');
const router = express.Router();
require('dotenv').config();


const { login, signup, verify, forgottenpassword, passwordreset, logout, googleCallBack, facebookCallBack } = require('../contollers/auth');
const passport = require('passport');

router.post('/message', login)


module.exports = router

