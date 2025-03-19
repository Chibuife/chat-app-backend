const express = require('express');
const router = express.Router();
require('dotenv').config();


const { getallusers, friendRequest, getallfriends, addFriend, removeFriend, getfriendswithmessage, getUser } = require('../contollers/chat');

router.post('/getallusers', getallusers)
router.post('/friendRequest', friendRequest)
router.post('/getallfriends', getallfriends)
router.post('/addfriend', addFriend)
router.post('/removeFriend', removeFriend)
router.post('/getfriendswithmessage', getfriendswithmessage)
router.post('/getUser', getUser)


module.exports = router

