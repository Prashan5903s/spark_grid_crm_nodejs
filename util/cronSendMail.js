const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];

console.log('Brevo API Key:', process.env.BREVO_API_KEY);

apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async () => {
    try {
        const emailData = {
            sender: {
                email: 'info@crm.sparkgrid.co.in',
                name: 'CRM SparkGrid'
            },
            to: [{
                email: 'prashant@dreamweaversindia.com',
                name: 'Prashant Chaubey'
            }],
            subject: 'Test Email from Node.js',
            htmlContent: `
                <html>
                    <body>
                        <h1>Hello from Brevo</h1>
                        <p>This email was sent using Node.js + Brevo API.</p>
                    </body>
                </html>
            `
        };

        const response = await apiInstance.sendTransacEmail(emailData);

        console.log('Email sent successfully:', response);
        return response;
    } catch (error) {
        console.error(
            'Error sending email:',
            error.response?.body || error.message
        );
    }
};



module.exports = sendEmail;