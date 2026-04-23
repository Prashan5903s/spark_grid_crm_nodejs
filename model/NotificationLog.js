const mongoose = require("mongoose");

const schema = mongoose.Schema;

const notificationLogSchema = new schema({
    notification_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'notification_template',
        required: true
    },
    template_name: {
        type: String,
        required: true,
        maxlength: 100
    },
    schedule_days: {
        type: String,
        required: true,
        maxlength: 3
    },
    notification_type: {
        type: String,
        unique: false,
        default: "null",
        required: false,
    },
    subject: {
        type: String,
        required: true,
        maxlength: 255
    },
    message: {
        type: String,
        required: true,
        maxlength: 50000
    },
    default_select: {
        type: Boolean,
        required: true,
        default: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now()
    },
    updated_at: {
        type: Date,
        required: false,
        default: Date.now()
    }
}, {
    collection: "notification_log"
});

module.exports = mongoose.model("notificationLog", notificationLogSchema)