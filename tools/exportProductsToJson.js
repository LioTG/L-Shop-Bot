require('dotenv/config');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../schemas/Product');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'products.json');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const products = await Product.find().lean();

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf8');

    console.log(`Exported ${products.length} products to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error exporting products:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
