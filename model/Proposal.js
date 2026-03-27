const mongoose = require("mongoose")

const proposalSchema = new mongoose.Schema({
    lead_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "leads",
        required: true
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
    industrial_sector_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    base_unit_cost: {
        type: String,
        maxLength: 5,
        required: true
    },
    base_solar_unit_rate: {
        type: String,
        maxLength: 5,
        required: true
    },
    sent_time: {
        type: Date,
        default: Date.now(),
        required: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
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
})

module.exports = mongoose.model("proposal", proposalSchema)