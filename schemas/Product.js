const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    imageUrl: {
        type: String,
        default: '',
    },
    quantity: {
        type: Number,
        required: true,
    },
});

const Product = mongoose.model('Product', productSchema);

module.exports = { Product, productSchema };