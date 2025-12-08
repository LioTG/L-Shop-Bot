require('dotenv/config');
const mongoose = require('mongoose');
const { Product } = require('../schemas/Product');
const { Category } = require('../schemas/Category');

// Si tienes productos sin categoría, asígnalos a esta (ajusta al valor que uses en tus choices).
const DEFAULT_CATEGORY = 'cases';

const randomId = () => Math.floor(Math.random() * 10_000) + 1;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Rellena el campo category en productos huérfanos.
    const result = await Product.updateMany(
      { $or: [{ category: { $exists: false } }, { category: '' }] },
      { $set: { category: DEFAULT_CATEGORY } }
    );
    console.log(`Productos actualizados con categoría por defecto: ${result.modifiedCount}`);

    // Construye un mapa categoría -> ids de productos.
    const allProducts = await Product.find().select('_id category');
    const byCategory = new Map();
    for (const product of allProducts) {
      const cat = product.category || DEFAULT_CATEGORY;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(product._id);
    }

    // Crea/actualiza categorías y asigna el arreglo products.
    for (const [categoryName, productIds] of byCategory.entries()) {
      const category = await Category.findOneAndUpdate(
        { name: categoryName },
        {
          $setOnInsert: {
            id: randomId(),
            name: categoryName
          },
          $set: { products: productIds }
        },
        { new: true, upsert: true }
      );
      console.log(`Categoria ${category.name}: ${productIds.length} productos vinculados`);
    }

    console.log('Reparación de categorías completada.');
  } catch (error) {
    console.error('Error reparando categorías:', error);
  } finally {
    await mongoose.disconnect();
  }
})();
