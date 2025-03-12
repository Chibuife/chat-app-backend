const express = require('express');
const router = express.Router();
require('dotenv').config();


const { getallusers, friendRequest, getallfriends, addFriend, removeFriend } = require('../contollers/chat');

router.post('/getallusers', getallusers)
router.post('/friendRequest', friendRequest)
router.post('/getallfriends', getallfriends)
router.post('/addfriend', addFriend)
router.post('/removeFriend', removeFriend)


module.exports = router

