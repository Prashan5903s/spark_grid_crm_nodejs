const mongoose = require('mongoose')

const exportCenter = new mongoose.Schema({
    document_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "document_type",
        required: true
    },
    user_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_type",
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 255
    },
    file_path: {
        type: String,
        required: false,
        maxlength: 255
    },
    description: {
        type: String,
        maxLength: 5000,
        required: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    created_at: {
        type: Date,
        default: Date.now(),
    },
    updated_at: {
        type: Date,
        default: Date.now(),
    }
}, {
    collection: "export_center"
})

module.exports = mongoose.model('export_center', exportCenter)