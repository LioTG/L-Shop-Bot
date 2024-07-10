const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
});

const UserProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, required: true },
    inventory: { type: [InventoryItemSchema], default: [] }
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);