const Message = require("../model/Chat");
const Friend = require("../model/Friends");
const User = require("../model/User");
const clients = new Map();

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
            // Save message to MongoDB
            // const savedMessage = new Message({
            //     from: message.from,
            //     to: message.to,
            //     text: message.text
            // });

            // // await savedMessage.save();
            // await Friend.findByIdAndUpdate(
            //     { id: message.to }, {
            //         $push: {
            //             from: message.from,
            //             to: message.to,
            //             text: message.text
            //         }
            // }, { new: true, runValidators: true }
            // )
            await User.findOneAndUpdate(
                { 
                    _id: message.from, 
                    "friends.id": message.to // Find the friend inside the array
                },
                { 
                    $push: { "friends.$.message": { 
                        from: message.from, 
                        to: message.to, 
                        text: message.text, 
                        timestamp: new Date() 
                    }} 
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


module.exports = connection;