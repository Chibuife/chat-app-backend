const User = require('../model/User')
const { BadRequestError, UnauthenticatedError } = require('../errors')
const { StatusCodes } = require('http-status-codes')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const passport = require("passport");
require('dotenv').config();
const crypto = require('crypto');
const sendResetEmail = require('../helperFn/send-password-reset-email')
const sendVerificationEmail = require('../helperFn/send-verification-email')

const login = async (req, res) => {
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
    res.status(StatusCodes.OK).json({ token })
}

const signup = async (req, res) => {
    const { email, password, lastName, firstName } = req.body
    if (!email || !password) {
        throw new BadRequestError('Please provide email and password')
    }
    const userIdentify = await User.findOne({ email })
    if(userIdentify){
        throw new BadRequestError('user already exists')
    }

    let profileImageUrl = null;
    if (req.file) {
      profileImageUrl = req.file.path;
    }
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    const user = await User.create({ email, password,  lastName, firstName, image: profileImageUrl })
    const token = user.createJWT()

    res.status(StatusCodes.OK).json({ token })
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
    res.status(StatusCodes.OK).send({ msg: 'Password reset email sent' });
}



const passwordreset = async (req, res) => {
    const { password } = req.body;
    const { token } = req.query;
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        const _id = await decoded.userId;

        const user = await User.findByIdAndUpdate(
            { _id }, { password }, { new: true, runValidators: true }
        )
        if (user) {
            res.status(StatusCodes.OK).send({ msg: 'Password updated successfully' });
        } else {
            throw new UnauthenticatedError('Invalid Credentials');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        throw new BadRequestError('Please provide email and password');
    }
};


const logout = () => {
    req.logout();
    res.redirect(process.env.CLIENT_URL)
}


const facebookCallBack = (req, res) => {
    // res.redirect(process.env.CLIENT_URL);
    console.log(res)
    res.redirect('http://localhost:3000/');
}




module.exports = { login, signup, forgottenpassword, passwordreset, logout, facebookCallBack }