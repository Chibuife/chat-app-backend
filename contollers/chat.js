const { BadRequestError } = require("../errors");
const User = require("../model/User");
const clients = new Map();
const mongoose = require("mongoose");
const { ObjectId } = require('mongoose').Types;
require("dotenv").config();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Group = require("../model/Group");

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
  
  const connectedUsers = new Map();

async function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', async (data) => {
        const message = JSON.parse(data);

        if (message.type === 'register') {
            clients.set(message.userId, ws);
            console.log(`User ${message.userId} registered`);
        }
        console.log(message, 'message')
        
        if (message.type === "get_group_history") {
            const group = await Group.findOne({ _id: message.group });

            if (!group) {
                return ws.send(JSON.stringify({ type: "error", message: "Group not found" }));
            }

            ws.send(JSON.stringify({ type: "history", messages: group.message }));
        }
        if (message.type === 'group_message') {
            try {
                let imageUrl = null; 

                if (message.image) {
                    const result = await cloudinary.uploader.upload(message.image, {
                        folder: "chat_images",
                    });
                    imageUrl = result.secure_url;
                }
        
                const group = await Group.findOneAndUpdate(
                    { _id: message.to },
                    {
                        $push: {
                            message: {
                                from: message.from,
                                text: message.text,
                                timestamp: new Date(),
                                image: imageUrl, 
                            },
                        },
                    },
                    { new: true }
                );
                console.log(group,"group")

                if (!group) {
                    return ws.send(JSON.stringify({ type: "error", message: "Group not found" }));
                }
                // ws.send(JSON.stringify({ type: "history", messages: group.message }));
            } catch (error) {
                console.error("Error sending group message:", error);
                ws.send(JSON.stringify({ type: "error", message: "Internal server error" }));
            }
        }
        if (message.type === 'private_message') {
            const recipientWs = clients.get(message.to);

            let imageUrl = null;
            console.log(message.image,'message.image')
            if (message.image) {
                const result = await cloudinary.uploader.upload(message.image, {
                    folder: "chat_images"
                })
                imageUrl = result.secure_url;
            }

            await User.findOneAndUpdate(
                {
                    _id: message.from,
                    "friends._id": message.to
                },
                {
                    $push: {
                        "friends.$.message": {
                            from: message.from,
                            to: message.to,
                            text: message.text,
                            image: imageUrl,
                            timestamp: new Date()
                        }
                    }
                },
                { new: true, runValidators: true }
            );

            const to = await User.findOneAndUpdate(
                {
                    _id: message.to,
                    "friends._id": message.from
                },
                {
                    $push: {
                        "friends.$.message": {
                            from: message.from,
                            to: message.to,
                            text: message.text,
                            image: imageUrl,
                            timestamp: new Date()
                        }
                    }
                },
                { new: true, runValidators: true }
            );

            console.log(to, "to")

            // Send message to recipient if online
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                recipientWs.send(JSON.stringify({
                    from: message.from,
                    message: message.text
                }));
            }
        }

        if (message.type === 'get_history') {
            const userId = new ObjectId(message.userId);
            const friendId = new ObjectId(message.to);

            const user = await User.findOne({
                _id: userId,
                "friends._id": friendId
            }, { "friends.$": 1 });
            console.log(user, 'user');

            if (user && user.friends.length > 0) {
                const chatHistory = user.friends[0].message.sort((a, b) => a.timestamp - b.timestamp);
                ws.send(JSON.stringify({ type: 'history', messages: chatHistory }));
            } else {
                ws.send(JSON.stringify({ type: 'history', messages: [] }));
            }
        }
    });

    ws.on('close', () => {
        for (let [userId, socket] of clients.entries()) {
            if (socket === ws) {
                clients.delete(userId);
                console.log(`User ${userId} disconnected`);
            }
        }
    });
}
const getallusers = async (req, res) => {
    try {
        const { id, username } = req.body;

        const user = await User.findOne({ _id: id });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const friendIds = user.friends.map(friend => friend._id);
        const friendRequestIds = user.friendRequest.map(request => request._id);
        const sentRequestIds = user.sentRequest.map(request => request._id);
        const excludedIds = [new mongoose.Types.ObjectId(id), ...friendIds.map(fid => new mongoose.Types.ObjectId(fid)), ...friendRequestIds, ...sentRequestIds];

        let query = { _id: { $nin: excludedIds } };

        if (username && username.trim() !== "") {
            query.$or = [
                { firstName: { $regex: new RegExp(`^${username}`, "i") } },
                { lastName: { $regex: new RegExp(`^${username}`, "i") } }
            ];
        }

        // Find users based on query
        const users = await User.find(query);

        const filteredUsers = users.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image,
            id: user._id,
            email: user.email
        }));

        return res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

const friendRequest = async (req, res) => {
    const { id, userId, } = req.body
    const friendRequest = {
        _id: userId
    }
    const user = await User.findOneAndUpdate(
        { _id: id },
        {
            $addToSet: { friendRequest }
        },
        { new: true, runValidators: true }
    );

    await User.findOneAndUpdate(
        { _id: userId },
        {
            $addToSet: { sentRequest: { _id: id } }
        },
        { new: true, runValidators: true }
    );
    return res.status(200).json({ message: 'request sent', id: user._id })
}

const addFriend = async (req, res) => {
    const { id, userId, } = req.body

    const user = await User.findById(userId);
    const request = user.friendRequest.filter(req => req._id.toString() === id);

    console.log(request, user, 'req')
    if (request && userId) {
        await User.findByIdAndUpdate(
            { _id: userId },
            {
                $pull: { friendRequest: { _id: id } },
                $addToSet: { friends: request }
            },
            { new: true }
        );
        await User.findByIdAndUpdate({ _id: id }, {
            $pull: { sentRequest: { _id: id } },
            $addToSet: { friends: { _id: userId } }
        });
    }


    return res.status(200).json({ message: 'accepted', id: user })

}

const removeFriend = async (req, res) => {
    const { id, userId } = req.body

    console.log(id, userId)

    await User.findByIdAndUpdate({ _id: userId }, {
        $pull: { friends: { _id: id } }
    });
    await User.findByIdAndUpdate({ _id: id }, {
        $pull: { friends: { _id: userId } }
    });

    return res.status(200).json({ message: 'friend removed' })
}
const cancelFriendReq = async (req, res) => {
    const { id, userId } = req.body


    await User.findByIdAndUpdate({ _id: userId }, {
        $pull: { sentRequest: { _id: id } }
    });
    await User.findByIdAndUpdate({ _id: id }, {
        $pull: { friendRequest: { _id: userId } }
    });

    return res.status(200).json({ message: 'canceled request' })
}



const getallfriends = async (req, res) => {
    try {
        const { id, username } = req.body;

        const user = await User.findById(id).select('friends friendRequest sentRequest');
        if (!user) {
            throw new Error('User not found');
        }
        console.log(id, 'id')
        const friendIds = user.friends.map(friend => friend._id);
        const friendRequestIds = user.friendRequest.map(request => request._id);
        const sentRequestIds = user.sentRequest.map(request => request._id);

        const query = { _id: { $in: [...friendIds, ...friendRequestIds, ...sentRequestIds] } };

        if (username && username.trim() !== "") {
            query.$or = [
                { firstName: { $regex: new RegExp(`^${username}`, "i") } },
                { lastName: { $regex: new RegExp(`^${username}`, "i") } }
            ];
        }

        const users = await User.find(query);

        const filteredUsers = users.map(use => ({
            firstName: use.firstName,
            lastName: use.lastName,
            image: use.image,
            id: use._id.toString(),
            type: friendIds.toString().includes(use._id.toString()) ? "friend" : friendRequestIds.toString().includes(use._id.toString()) ? "friendRequest" : "sentRequest"
        }))
        console.log(friendIds.toString(), filteredUsers, 'user')

        return res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

const getfriendswithmessage = async (req, res) => {
    try {
        const { id, username } = req.body;

        const user = await User.findById(id).select('friends group');
        if (!user) {
            throw new Error('User not found');
        }

        const friendIds = user.friends.map(friend => friend._id);

        const query = { _id: { $in: [...friendIds] } };

        if (username && username.trim() !== "") {
            query.$or = [
                { firstName: { $regex: new RegExp(`^${username}`, "i") } },
                { lastName: { $regex: new RegExp(`^${username}`, "i") } }
            ];
        }

        const users = await User.find(query);
        const getLastMessage = (friend) => {
            // if (!friend.message || friend.message.length === 0) return null;
            const currentfriend = friend.friends.filter((item) => item._id.toString() === id)[0]
            const lastMsg = currentfriend.message.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            console.log(currentfriend.message, id, 'friend')

            return lastMsg;
        };

        const filteredUsers = users.map(use => ({
            firstName: use.firstName,
            lastName: use.lastName,
            image: use.image,
            id: use._id.toString(),
            lastMessage: getLastMessage(use),
            active: connectedUsers.has(user._id.toString())
        }))

        const groupIds = user.group.map(g => g.id);
        const groups = await Group.find({ _id: { $in: groupIds } });

        const getLastGroupMessage = (group) => {
            if (!group.message || group.message.length === 0) return null;
            return group.message.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        };

        const groupList = await Promise.all(groups.map(async (group) => {
            const membersDetails = await User.find({ _id: { $in: group.members } }).select('firstName lastName image');
        
            return {
                id: group._id.toString(),
                name: group.name,
                lastMessage: getLastGroupMessage(group),
                members: membersDetails.map(member => ({
                    id: member._id.toString(),
                    name: `${member.firstName} ${member.lastName}`,
                    image: member.image
                })),
                timestamp: group.timestamp
            };
        }));

        return res.status(200).json([...filteredUsers, ...groupList ]);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

const getUser = async (req, res) => {
    try {
        const { id } = req.body
        const user = await User.findOne({ _id: id })
        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }
        return res.status(200).json({
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image,
            id: user._id.toString()
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }

}


const updateProfile = async (req, res) => {
    const { _id, email, lastName, firstName } = req.body
    let profileImageUrl = null;
    if (req.file) {
        profileImageUrl = req.file.path;
    }
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);
    const checkEmail = await User.findOne({email})
    const check = await User.findOne({_id})
    if(checkEmail && checkEmail.email !== check.email){
        throw new BadRequestError('user already exists')
    }
    const response = {}
    if (firstName || firstName !== 'undefined') response.firstName = firstName;
    if (lastName || lastName !== 'undefined') response.lastName = lastName;
    if (email || email !== 'undefined') response.email = email;
    if (profileImageUrl) response.image = profileImageUrl;

    const user = await User.findOneAndUpdate({ _id },response, { new: true })
    res.status(200).json({ firstName: user.firstName, lastName: user.lastName, email: user.email, image: user.image, _id: user._id })
}
module.exports = { connection, getallusers, friendRequest, getallfriends, addFriend, removeFriend, getfriendswithmessage, getUser, cancelFriendReq, updateProfile };