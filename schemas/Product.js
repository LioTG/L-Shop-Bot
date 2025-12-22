const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    socket: { type: String },
    ramType: { type: String },
    ramSlots: { type: Number }
});

const Product = mongoose.model('Product', productSchema);

module.exports = { Product };
