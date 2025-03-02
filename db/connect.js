const mongoose = require('mongoose')



const connectDB = (url) => {
   return mongoose.connect(url, {
        useUnifiedTopology: true,
    })
}

module.exports = connectDB