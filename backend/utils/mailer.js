
const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: process.env.SENDER_EMAIL,
        name: "Swafy"
      },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    });

    console.log("✅ Email envoyé via Brevo API");

  } catch (err) {
    console.error("❌ Email error:", err.response?.text || err.message);
    throw err;
  }
};

module.exports = { sendEmail };
