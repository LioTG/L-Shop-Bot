const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
});

const UserProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    inventory: { type: [InventoryItemSchema], default: [] },
    lastDailyCollected: { type: Date }
});

UserProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
