const nodemailer = require("nodemailer");

// Configure SMTP transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send password reset email with reset link
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.resetLink - Password reset link
 */
async function sendPasswordResetEmail({ to, resetLink }) {
  const mailOptions = {
    from: `"Bharat Build" <${process.env.SMTP_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetLink}">${resetLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 15 minutes.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Send generic notification email
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email message (plain text or HTML)
 */
async function sendNotificationEmail({ to, subject, message }) {
  const mailOptions = {
    from: `"Bharat Build" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${message}
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendPasswordResetEmail,
  sendNotificationEmail,
};
