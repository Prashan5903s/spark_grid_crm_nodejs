const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
    type: {
        type: String,
        unique: true,
        required: true,
        maxlength: 100
    },
    leads_status_data: [{
        title: {
            type: String,
            required: true,
            maxlength: 255
        },
        color: {
            type: String,
            required: true,
            maxLength: 10
        }
    }],
    leads_source_data: [{
        title: {
            type: String,
            required: true,
            maxlength: 255
        },
    }],
    solution_data: [{
        title: {
            type: String,
            required: true,
            maxlength: 255
        },
    }],
    follow_up_type_data: [{
        title: {
            type: String,
            required: true,
            maxLength: 255
        }
    }],
    follow_up_status_data: [{
        title: {
            type: String,
            required: true,
            maxLength: 255
        }
    }],
    follow_up_priority_data: [{
        title: {
            type: String,
            required: true,
            maxLength: 255
        }
    }],
    industrial_sector_data: [{
        title: {
            type: String,
            required: true,
            maxLength: 255
        }
    }],
    user_level_data: [{
        title: {
            type: String,
            maxLength: 20,
            required: true
        }
    }]
}, {
    collection: 'app_config'
});

module.exports = mongoose.model('app_config', appConfigSchema);
