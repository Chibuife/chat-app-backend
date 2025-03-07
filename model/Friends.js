const mongoose = require('mongoose')

const friendSchema = new mongoose.Schema({
    name: String,
    image: String,
    id: mongoose.Schema.Types.ObjectId,
    message:[{
        from: String,
        to: String,
        text: String,
        timestamp: { type: Date, default: Date.now },
    }],
    timestamp: { type: Date, default: Date.now },
});

const Friend = mongoose.model('Friend', friendSchema);

module.exports = Friend;