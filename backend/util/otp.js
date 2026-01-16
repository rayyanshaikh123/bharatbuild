exports.generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
const axios = require("axios");

exports.sendOtpSms = async (phone, otp) => {
  await axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    {
      route: "otp",
      variables_values: otp,
      numbers: phone,
    },
    {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
};
