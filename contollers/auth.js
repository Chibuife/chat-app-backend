const User = require('../model/User')
const { BadRequestError, UnauthenticatedError } = require('../errors')
const { StatusCodes } = require('http-status-codes')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const passport = require("passport");
require('dotenv').config();
const crypto = require('crypto');
const sendResetEmail = require('../helperFn/send-password-reset-email')
const newAdmin = require('../helperFn/notify-admin')
const sendVerificationEmail = require('../helperFn/send-verification-email')

const login = async (req, res) => {
    // console.log(req.body)
    const { email, password } = req.body
    if (!email || !password) {
        throw new BadRequestError('Please provide email and password')
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new UnauthenticatedError('Invalid Credentials')
    }

    const isPasswordCorrect = await user.comparePassword(password)

    if (!isPasswordCorrect) {
        throw new UnauthenticatedError('Invalid Credentials')
    }

    const token = user.createJWT()
    res.status(StatusCodes.OK).json({ user: { name: user.name }, token })
}

const signup = async (req, res) => {
    const user = await User.create({ ...req.body })
    const token = user.createJWT()

    // // Generate email verification token
    // const verificationToken = crypto.randomBytes(32).toString('hex');
    // user.emailVerificationToken = verificationToken;
    // user.emailVerificationExpires = Date.now() + 3600000;
    // await user.save();
    const verificationToken = user.verificationtoknJWT()


   
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify/${verificationToken}`;
    await sendVerificationEmail(user.email, verificationUrl);

    res.status(StatusCodes.OK).json({ user: { name: user.name }, token })
}

const verify = async (req, res) => {
    const { token } = req.params;
    
    // Verify token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const _id = await decoded.userId;

    const user = await User.findByIdAndUpdate(
        { _id }, { isVerified: true }, { new: true, runValidators: true }
    )

    if (!user) {
        return res.status(StatusCodes.BAD_REQUEST).send('Invalid or expired token');
    }

    res.status(StatusCodes.OK).send('Your email has been verified. You can now log in.');
}

const forgottenpassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email })
    if (!user) {
        throw new UnauthenticatedError('Invalid Credentials')
    }

    const token = user.forgottenpasswordJWT()

    // Send reset email
    sendResetEmail(user.email, token);
    res.status(StatusCodes.OK).send({msg:'Password reset email sent'});
}



const passwordreset = async (req, res) => {
    const { password } = req.body;
    const { token } = req.query;
    try {
        // Verify token
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        const _id = await decoded.userId;

        const user = await User.findByIdAndUpdate(
            { _id }, { password }, { new: true, runValidators: true }
        )



        if (user) {
            res.status(StatusCodes.OK).send({msg:'Password updated successfully'});
        } else {
            throw new UnauthenticatedError('Invalid Credentials');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        throw new BadRequestError('Please provide email and password');
    }
};


// const makeAdmin = async () => {
//     const { email } = req.body;

//     if (req.user.email != 'chibuifejohn1@gamil.com') {
//         throw new UnauthenticatedError(`User unauthorized`);
//     }

//     await User.findOneAndUpdate({ email }, { admin: true });
//     newAdmin(email);

//     res.status(StatusCodes.OK).send('new admin set');
// }

const logout = () => {
    req.logout();
    res.redirect(process.env.CLIENT_URL)
}

 
//signup with google
const googleCallBack = (req, res) => {
    // res.redirect(process.env.CLIENT_URL);
    console.log(res)
    res.redirect('http://localhost:3000/');
}


const facebookCallBack = (req, res) => {
    // res.redirect(process.env.CLIENT_URL);
    console.log(res)
    res.redirect('http://localhost:3000/');
}


// (req, res) => {
//     // Successful authentication
//     res.redirect('/');
// }

module.exports = { login, signup, verify, forgottenpassword, passwordreset, logout, googleCallBack, facebookCallBack }