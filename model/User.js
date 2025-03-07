const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


function dateOfBirthValidator(dateOfBirth) {
    return dateOfBirth instanceof Date && !isNaN(dateOfBirth) && dateOfBirth < new Date();
}


const userSchema = mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true
    },
    name: {
        type: String,
        require: [true, 'provide name'],
        minlength: 3,
        maxlength: 15
    },
    email: {
        type: String,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
    },
    isVerified: { type: Boolean, default: false },
    friends: [
        {
            name: String,
            image: String,
            id: mongoose.Schema.Types.ObjectId,
            message: [{
                from: String,
                to: String,
                text: String,
                timestamp: { type: Date, default: Date.now },
            }],
        }
    ]
})



userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        return next(err);
    }
});


userSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();

    // Check if password is being updated
    if (update.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            update.password = await bcrypt.hash(update.password, salt);
            // console.log('just before saving', update.password);
        } catch (err) {
            return next(err);
        }
    }
    next();
});


//function to create token
userSchema.methods.createJWT = function () {
    return jwt.sign(
        { _id: this._id, name: this.name, email: this.email, dateOfBirth: this.dateOfBirth, games: this.games, twitter: this.twitter, twitch: this.twitch, facebook: this.facebook, discord: this.discord, youtube: this.youtube, whatsapp: this.whatsapp, gender: this.gender, imageName: this.imageName, country: this.country, },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_LIFETIME,
        }
    )
}



//function to decrypt users password
userSchema.methods.comparePassword = async function (canditatePassword) {
    const isMatch = await bcrypt.compare(canditatePassword, this.password)
    return isMatch
}


//jwt for forgotten password
userSchema.methods.forgottenpasswordJWT = function () {
    return jwt.sign(
        { userId: this._id, },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_TEMP,
        }
    )
}


//jwt for Verfication token
userSchema.methods.verificationtoknJWT = function () {
    return jwt.sign(
        { userId: this._id, },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_TEMP,
        }
    )
}



const User = mongoose.model('User', userSchema);

module.exports = User;