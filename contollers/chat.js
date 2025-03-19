const User = require("../model/User");
const clients = new Map();
const mongoose = require("mongoose");
const { ObjectId } = require('mongoose').Types;

async function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', async (data) => {
        const message = JSON.parse(data);

        if (message.type === 'register') {
            clients.set(message.userId, ws);
            console.log(`User ${message.userId} registered`);
        }
        console.log(message, 'message')
        if (message.type === 'private_message') {
            const recipientWs = clients.get(message.to);

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
                            timestamp: new Date()
                        }
                    }
                },
                { new: true, runValidators: true }
            );

            console.log(to,"to")

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
            },  { "friends.$": 1 });
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
        const excludedIds = [new mongoose.Types.ObjectId(id), ...friendIds.map(fid => new mongoose.Types.ObjectId(fid)), friendRequestIds, sentRequestIds];

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
            $addToSet: { sentRequest:{_id:id} }
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
            $addToSet: { friends: {_id:userId} }
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
            type: friendIds.toString().includes(use._id.toString()) ? "friend" :friendRequestIds.toString().includes(use._id.toString()) ? "friendRequest": "sentRequest"
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

        const user = await User.findById(id).select('friends');
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
            const currentfriend = friend.friends.filter((item)=> item._id.toString() === id)[0]
            const lastMsg = currentfriend.message.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            console.log(currentfriend.message,id,'friend')

            return lastMsg;
        };
        
        const filteredUsers = users.map(use => ({
            firstName: use.firstName,
            lastName: use.lastName,
            image: use.image,
            id: use._id.toString(),
            lastMessage: getLastMessage(use),
        }))

        return res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

const getUser = async(req, res)=>{     
    try{ 
        const {id} = req.body
        const user = await User.findOne({_id:id})
        if(!user){
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
module.exports = { connection, getallusers, friendRequest, getallfriends, addFriend, removeFriend, getfriendswithmessage, getUser };