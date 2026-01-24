const twilio = require("twilio");

/**
 * Generate a 4-digit numeric OTP
 * @returns {string}
 */
exports.generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Send OTP via Twilio SMS
 * @param {string} phone - Recipient phone number (E.164 format recommended)
 * @param {string} otp - The OTP to send
 */
exports.sendOtpSms = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    console.warn("Twilio credentials missing. Skipping SMS send.");
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    // Ensure phone number has country code (Twilio requirement)
    // If it doesn't start with +, assume +91 (India) as default for this project
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    await client.messages.create({
      body: `Your BharatBuild OTP is: ${otp}. Valid for 5 minutes.`,
      from: fromPhone,
      to: formattedPhone,
    });

    console.log(`[Twilio] OTP sent successfully to ${formattedPhone}`);
  } catch (err) {
    console.error(`[Twilio Error] Failed to send SMS: ${err.message}`);
    throw new Error("Failed to send OTP. Please try again later.");
  }
};
