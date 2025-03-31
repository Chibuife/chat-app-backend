require('express-async-errors');
const express = require('express');
const app = express();
const http = require('http');
require('dotenv').config();
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');
const authRoute = require('./router/auth-route')
const WebSocket = require('ws');

const chatRoute = require('./router/chat-route')
const server = http.createServer(app);

const connectDB = require('./db/connect')
require('./passport-setup');
const WebSocketServer = require('ws');
const {connection} = require('./contollers/chat');
const clients = new Map();
const wss = new WebSocket.Server({ server });



wss.on('connection', connection);



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

const allowedOrigins = [
    "http://localhost:19006", 
    "http://your-local-ip:19006", 
    "https://yourdomain.com",
    "https://expo.dev" 
  ];
  
app.use(cors({   
    origin: allowedOrigins,
    credentials: true 
 }));
app.use(xss());

// error middleware to prevent crash
app.use(express.json());

// routes
app.use('/api/v1/auth', authRoute)
app.use('/api/v1/', chatRoute)


app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);



const port = process.env.PORT || 8080;

const start = async () => {
    try {
        await connectDB(process.env.MONGODB_URI)
        server.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.log(error)
    }
}

start()