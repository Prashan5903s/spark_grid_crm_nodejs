const mongoose = require("mongoose")

const leadSchema = new mongoose.Schema({
    lead_status_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    source_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    solution_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    company_name: {
        type: String,
        maxLength: 255,
        required: false
    },
    name: {
        type: String,
        maxLength: 255,
        required: true,
    },
    email: {
        type: String,
        maxLength: 255,
        required: true
    },
    phone: {
        type: String,
        maxLength: 255,
        required: true
    },
    state_id: {
        type: String,
        required: false
    },
    city_id: {
        type: String,
        required: false
    },
    average_monthly_consumption: {
        type: String,
        maxLength: 255,
        required: false
    },
    sanctioned_load: {
        type: String,
        maxLength: 255,
        required: false
    },
    address: {
        type: String,
        maxLength: 5000,
        required: false
    },
    pincode: {
        type: String,
        maxLength: 6,
        required: false
    },
    is_converted: {
        type: Boolean,  
        default: false
    },
    assigned_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null,
        required: false
    },
    created_at: {
        type: Date,
        default: Date.now(),
        required: true,
    },
    updated_at: {
        type: Date,
        default: null,
        required: false
    }
}, {
    collection: "leads"
})

module.exports = mongoose.model("lead", leadSchema)