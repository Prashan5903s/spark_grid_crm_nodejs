const SibApiV3Sdk = require('sib-api-v3-sdk');

require('dotenv').config();

const smtpKey = process.env.BREVO_API_KEY;
const smtpServer = process.env.smtp_server;
const smtp_port = process.env.smtp_port;
const login = process.env.login;

// Configure API key
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];

apiKey.apiKey = smtpKey;

// Transactional email API
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
    } catch (error) {
        console.error('Error sending email:', error.response?.body || error.message);
    }
};

sendEmail();