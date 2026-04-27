const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const emailTemplateLogSchema = new Schema({
    lead_id: {
        type: Schema.ObjectId,
        ref: "lead",
        required: true,
    },
    follow_up_id: {
        type: Schema.ObjectId,
        ref: "follow_up",
        required: true,
    },
    notification_id: {
        type: Schema.ObjectId,
        ref: "follow_up",
        required: true,
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    recipient_email: {
        type: String,
        maxLength: 255,
        required: true
    },
    subject: {
        type: String,
        maxlength: 1000, // Maximum length for LONGTEXT
        required: true, // body is required
    },
    message: {
        type: String,
        maxlength: 6555, // Maximum length for LONGTEXT
        required: true, // body is required
    },
    sender_date: {
        type: Date,
        required: true,
    },
    created_at: {
        type: Date,
        required: true, // created_at is required
        default: Date.now, // Default to current date/time
    },
    updated_at: {
        type: Date,
        required: false, // updated_at is optional
    },
});

module.exports = mongoose.model('email_template_log', emailTemplateLogSchema); // Model name 'EmailTemplate'