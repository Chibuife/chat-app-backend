const express = require('express');
const router = express.Router();
require("dotenv").config();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const { login, signup, forgottenpassword, passwordreset, logout,  facebookCallBack } = require('../contollers/auth');
const passport = require('passport');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "profile_pictures",
      allowed_formats: ["jpg", "png", "jpeg"],
      transformation: [{ width: 500, height: 500, crop: "limit" }], 
    },
  });
  
const upload = multer({ storage });

router.post('/login', login)
router.post('/signup', upload.single("profilePicture"), signup)
router.post('/forgotten-password', forgottenpassword)
router.put('/reset-password', passwordreset)

// router.post('/make-admin', makeAdmin)
router.get('/logout', logout)





// facebook auth 
router.get('/facebook',
    passport.authenticate('facebook'));

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    facebookCallBack
 );

module.exports = router

