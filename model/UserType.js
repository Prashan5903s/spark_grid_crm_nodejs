const mongoose = require("mongoose")

const userTypeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: 50,
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
    collection: "user_type"
})

userTypeSchema.virtual("document_types", {
    ref: "document_type",
    localField: "_id",
    foreignField: "user_type_id"
});

userTypeSchema.set("toJSON", { virtuals: true });
userTypeSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("user_type", userTypeSchema)