require('express-async-errors');
const express = require('express');
const app = express();
require('dotenv').config();
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');
const authRoute = require('./router/auth-route')


const connectDB = require('./db/connect')
require('./passport-setup');

// extra security packages
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');

const passport = require('passport');
const session = require('express-session');

app.use(express.json());
app.use(helmet());

app.use('/public', express.static('public'));


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
// app.use(passport.session());

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(xss());

// error middleware to prevent crash
app.use(express.json());

// routes
app.use('/api/v1/auth', authRoute)


app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);



const port = process.env.port || 8080;

const start = async () => {
    try {
        await connectDB(process.env.MONGODB_URI)
        app.listen(port,
        ()=> console.log(port))
    } catch (error) {
        console.log(error)
    }
}

start()