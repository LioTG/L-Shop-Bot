const { Schema, model } = require('mongoose');

const userProfileSchema = new Schema({
    userId: {
        type: String,
        required: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    lastDailyCollected: {
        type: Date,
    },
    inventory: {
        case: {
            type: Number,
            default: 0,
        },
        cpu: {
            type: Number,
            default: 0,
        },
        coolers: {
            type: Number,
            default: 0,
        },
        motherboard: {
            type: Number,
            default: 0,
        },
        ram: {
            type: Number,
            default: 0,
        },
        gpu: {
            type: Number,
            default: 0,
        },
        storage: {
            type: Number,
            default: 0,
        },
        psu: {
            type: Number,
            default: 0,
        },
    },
},
{ timestamps: true }
);

module.exports = model('UserProfile', userProfileSchema);
