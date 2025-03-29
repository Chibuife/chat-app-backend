const express = require('express');
const router = express.Router();
require("dotenv").config();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const { getallusers, friendRequest, getallfriends, addFriend, removeFriend, getfriendswithmessage, getUser, cancelFriendReq, updateProfile } = require('../contollers/chat');
const { createGroup, getGroup } = require('../contollers/group');
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
router.post('/getallusers', getallusers)
router.post('/friendRequest', friendRequest)
router.post('/getallfriends', getallfriends)
router.post('/addfriend', addFriend)
router.post('/removeFriend', removeFriend)
router.post('/getfriendswithmessage', getfriendswithmessage)
router.post('/getUser', getUser)
router.post('/cancelFriendReq', cancelFriendReq)
router.post('/updateProfile',upload.single("profilePicture"), updateProfile)
router.post('/createGroup', createGroup)
router.post('/getGroup', getGroup)

module.exports = router