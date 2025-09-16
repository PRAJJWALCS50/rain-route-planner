const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Rain Route Planner - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">🌧️ Rain Route Planner</h2>
          <p>Your OTP for email verification is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4f46e5; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Rain Route Planner!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">🌧️ Welcome to Rain Route Planner!</h2>
          <p>Hi ${name},</p>
          <p>Welcome to Rain Route Planner! Your account has been successfully created and verified.</p>
          <p>You can now:</p>
          <ul>
            <li>Plan routes between any cities in India</li>
            <li>Get real-time weather alerts along your route</li>
            <li>View interactive maps with rainfall data</li>
          </ul>
          <p>Happy and safe travels!</p>
          <p style="color: #666; font-size: 14px;">The Rain Route Planner Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};
