const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    template_name: {
        type: String,
        required: true,
        maxlength: 100
    },
    notification_type: {
        type: String,
        unique: true,
        maxlength: 200,
        required: true,
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
