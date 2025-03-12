const Message = require("../model/Chat");
const Friend = require("../model/Friends");
const User = require("../model/User");
const clients = new Map();
const mongoose = require("mongoose");

async function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', async (data) => {
        const message = JSON.parse(data);

        if (message.type === 'register') {
            clients.set(message.userId, ws);
            console.log(`User ${message.userId} registered`);
        }

        if (message.type === 'private_message') {
            const recipientWs = clients.get(message.to);

            await User.findOneAndUpdate(
                {
                    _id: message.from,
                    "friends.id": message.to
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



            // Send message to recipient if online
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                recipientWs.send(JSON.stringify({
                    from: message.from,
                    message: message.text
                }));
            }
        }

        if (message.type === 'get_history') {
            // Retrieve message history between two users
            const chatHistory = await Message.find({
                $or: [
                    { from: message.userId, to: message.to },
                    { from: message.to, to: message.userId }
                ]
            }).sort({ timestamp: 1 });
            ws.send(JSON.stringify({ type: 'history', messages: chatHistory }));
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

        const friendIds = user.friends.map(friend => friend.id);
        const excludedIds = [new mongoose.Types.ObjectId(id), ...friendIds.map(fid => new mongoose.Types.ObjectId(fid))];

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
    const { id, userId, image, firstName, lastName } = req.body
    // console.log(id, userId, image, firstName, lastName, "requuest")
    const friendRequest = {
        image, firstName, lastName, _id: userId
    }
    const user = await User.findOneAndUpdate(
        { _id: id },
        {
            $addToSet: { friendRequest }
        },
        { new: true, runValidators: true }
    );
    // console.log(user)
    return res.status(200).json({ message: 'request sent', id: user._id })
}

const addFriend = async (req, res) => {
    const { id, userId, image, firstName, lastName } = req.body
    console.log(id, userId, image, firstName, lastName,'addfriends')
    const friendRequest = {
        image, firstName, lastName, _id: userId
    }
    const user = await User.findById(userId);
    const request = user.friendRequest.find(req => req._id.toString() === id);
    console.log(request,user,'req')
    // if (request) {
    //     await User.findByIdAndUpdate(
    //         userId,
    //         {
    //             $pull: { friendRequest: { _id: requestId } }, // Remove request by ID
    //             $addToSet: { friends: request } // Push full request object to friends
    //         },
    //         { new: true }
    //     );
    //     await User.findByIdAndUpdate({_id:id}, {
    //         $addToSet: { friends: request } 
    //     });
    // }
    
   
    // console.log(user, 'user')
    return res.status(200).json({ message: 'accepted', id: user })

}

const removeFriend = async (req, res) => {
    const { id, userId } = req.body

    await User.findByIdAndUpdate({ id: userId }, {
        $pull: { friends: { id } }
    });

    await User.findByIdAndUpdate(id, {
        $pull: { friends: { id: userId } }
    });
}




const getallfriends = async (req, res) => {
    try {
        const { id, username } = req.body;

        // Fetch the current user's friends and friend requests
        const user = await User.findById(id).select('friends friendRequest');
        if (!user) {
            throw new Error('User not found');
        }

        // Extract friend and friend request IDs
        const friendIds = user.friends.map(friend => friend._id);
        const friendRequestIds = user.friendRequest.map(request => request._id);

        const query = { _id: { $in: [...friendIds, ...friendRequestIds] } };

        // If username is provided and not empty, add name filter
        if (username && username.trim() !== "") {
            query.$or = [
                { firstName: { $regex: new RegExp(`^${username}`, "i") } },
                { lastName: { $regex: new RegExp(`^${username}`, "i") } }
            ];
        }

        // Find users based on query
        const users = await User.find(query);
        // console.log(user, id, 'user', users)

        const filteredUsers = users.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image,
            id: user._id,
            type: friendIds.includes(user._id) ? "friend" : "friendRequest"
        }));

        return res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
module.exports = { connection, getallusers, friendRequest, getallfriends, addFriend, removeFriend };