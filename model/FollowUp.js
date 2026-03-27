const mongoose = require("mongoose");

const followupSchema = new mongoose.Schema({
    lead_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "lead",
        required: true,
        index: true
    },
    lead_data: {
        lead_status_id: {
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
            required: false
        },
        email: {
            type: String,
            maxLength: 255,
            required: false
        },
        phone: {
            type: String,
            maxLength: 255,
            required: false
        },
        state_id: {
            type: String,
            maxLength: 255,
            required: false
        },
        city_id: {
            type: String,
            maxLength: 255,
            required: false
        },
        address: {
            type: String,
            maxLength: 255,
            required: false
        },
        pincode: {
            type: String,
            maxLength: 255,
            required: false
        }
    },
    follow_up_date: {
        type: Date,
        required: true,
        index: true
    },
    next_follow_up_date: {
        type: Date,
        default: null
    },
    follow_up_type: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    notes: {
        type: String,
        maxLength: 5000
    },
    status: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    priority: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    reminder_before: {
        type: Number // minutes
    },
    completed_at: {
        type: Date,
        default: null
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    },
    collection: "follow_up"
});

module.exports = mongoose.model("follow_up", followupSchema);