const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
});

const UserProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0 },
    inventory: { type: [InventoryItemSchema], default: [] },
    lastDailyCollected: { type: Date }
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
