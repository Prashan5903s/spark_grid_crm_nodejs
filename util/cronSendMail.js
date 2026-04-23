require('dotenv').config();

const smtpKey = process.env.BREVO_API_KEY;
const smtpServer = process.env.smtp_server;
const smtp_port = process.env.smtp_port;
const login = process.env.login;

// Include the Brevo library

const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = smtpKey;

// Create API instance
const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();

// Create campaign object
const emailCampaigns = new SibApiV3Sdk.CreateEmailCampaign();

// Define campaign settings
emailCampaigns.name = "Campaign sent via the API";
emailCampaigns.subject = "My subject";
emailCampaigns.sender = {
    name: "testinguser@gmail.com",
    email: "prashant@dreamweaversindia.com"
};
emailCampaigns.type = "classic";

// Email content
emailCampaigns.htmlContent =
    "Congratulations! You successfully sent this example campaign via the Brevo API.";

// Select recipients
emailCampaigns.recipients = {
    listIds: [2, 7]
};

// Schedule sending in one hour
emailCampaigns.scheduledAt = "2018-01-01 00:00:01";

// Make API call
apiInstance.createEmailCampaign(emailCampaigns)
    .then((data) => {
        console.log("API called successfully. Returned data:", data);
    })
    .catch((error) => {
        console.error("Error creating campaign:", error);
    });