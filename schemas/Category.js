const mongoose = require('mongoose');
const { productSchema } = require('./Product')

const categorySchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    products: [productSchema]

});


module.exports = mongoose.model('Category', categorySchema)