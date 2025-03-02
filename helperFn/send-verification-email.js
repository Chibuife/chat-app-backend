const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, url) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        to: email,
        subject: 'Verify your email',
        text: `Click this link to verify your email: ${url}`,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail