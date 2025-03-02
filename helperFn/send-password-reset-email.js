const nodemailer = require('nodemailer');

function sendResetEmail(email, token) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const mailOptions = {
        from: 'chibuifejohn1@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `Click the following link to reset your password: http://localhost:3000/auth/passwordreset?token=${token}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}


module.exports = sendResetEmail;