const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        require: [true, 'provide name'],
        minlength: 3,
        maxlength: 15
    },
    message:[{
        from: String,
        text: String,
        timestamp: { type: Date, default: Date.now },
    }],
    members:[],
    timestamp: { type: Date, default: Date.now },
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;