const { Schema, model } = require('mongoose');

const cooldownSchema = new Schema({
    commandName: {
        type: String,
        required: true,
    },
    guildId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    endsAt: {
        type: Date,
        required: true,
    },
});

cooldownSchema.index({ commandName: 1, guildId: 1, userId: 1 }, { unique: true });

module.exports = model('Cooldown', cooldownSchema);
