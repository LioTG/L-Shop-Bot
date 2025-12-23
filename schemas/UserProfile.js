const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
}, { _id: false });

const PcComponentSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    productId: { type: Number },
    price: { type: Number },
    socket: { type: String },
    imageUrl: { type: String },
    ramType: { type: String }
}, { _id: false });

const PcBuildSchema = new mongoose.Schema({
    name: { type: String, required: true },
    components: { type: [PcComponentSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    mining: {
        isMining: { type: Boolean, default: false },
        startedAt: { type: Date },
        lastCollectedAt: { type: Date }
    }
}, { _id: false });

const UserProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    inventory: { type: [InventoryItemSchema], default: [] },
    pcs: { type: [PcBuildSchema], default: [] },
    lastDailyCollected: { type: Date }
});

UserProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
