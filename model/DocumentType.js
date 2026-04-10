const mongoose = require("mongoose")

const documentTypeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: 50,
    },
    user_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "user_type"
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    updated_at: {
        type: Date,
        default: null
    }
}, {
    collection: "document_type"
})

module.exports = mongoose.model("document_type", documentTypeSchema)