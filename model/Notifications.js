const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
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
        default: Date.now,
        required: true
    },
    updated_at: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    collection: 'notification_template'
});


module.exports = mongoose.model('notification_template', notificationSchema);