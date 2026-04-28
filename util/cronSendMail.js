const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];

apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance =
    new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({
    toEmail,
    toName,
    subject,
    htmlContent
}) => {
    try {
        const emailData = {
            sender: {
                email: "info@crm.sparkgrid.co.in",
                name: "Spark Grid"
            },
            to: [{
                email: toEmail,
                name: toName
            }],
            subject,
            htmlContent
        };

        const response =
            await apiInstance.sendTransacEmail(
                emailData
            );

        console.log(
            "Email sent successfully:",
            response
        );

        return response;
    } catch (error) {

        console.error(
            "Error sending email:",
            error.response?.body ||
            error.message
        );
        
        throw error;
    }
};

module.exports = sendEmail;