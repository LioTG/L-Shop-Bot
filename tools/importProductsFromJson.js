require('dotenv/config');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../schemas/Product');

const INPUT_FILE = path.join(__dirname, '..', 'data', 'products.json');

const normalizeSocket = (value) => value ? String(value).trim().toUpperCase() : undefined;
const normalizeRamType = (value) => value ? String(value).trim().toUpperCase() : undefined;
const normalizeRamSlots = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : undefined;
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const raw = await fs.readFile(INPUT_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error('products.json must be an array');
    }

    let upserted = 0;
    let updated = 0;
    let skipped = 0;
    let nameConflicts = 0;

    for (const item of data) {
      const id = Number(item.id);
      const name = item.name ? String(item.name).trim() : '';
      const price = Number(item.price);
      const imageUrl = item.imageUrl ? String(item.imageUrl).trim() : '';
      const category = item.category ? String(item.category).trim() : '';

      if (!Number.isFinite(id) || !name || !Number.isFinite(price) || !imageUrl || !category) {
        skipped += 1;
        continue;
      }

      const doc = {
        id,
        name,
        price,
        imageUrl,
        category,
        socket: normalizeSocket(item.socket),
        ramType: normalizeRamType(item.ramType),
        ramSlots: normalizeRamSlots(item.ramSlots)
      };

      const existingByName = await Product.findOne({ name }).select('_id id name').lean();

      if (existingByName) {
        const updateDoc = { ...doc };
        if (Number(existingByName.id) !== id) {
          delete updateDoc.id;
          nameConflicts += 1;
          console.log(`Name conflict for "${name}". Keeping existing id ${existingByName.id}, JSON id ${id} ignored.`);
        }

        await Product.updateOne({ _id: existingByName._id }, { $set: updateDoc });
        updated += 1;
        continue;
      }

      const existingById = await Product.findOne({ id }).select('_id name').lean();
      if (existingById) {
        await Product.updateOne({ _id: existingById._id }, { $set: doc });
        updated += 1;
        continue;
      }

      const result = await Product.updateOne(
        { id },
        { $set: doc },
        { upsert: true }
      );

      if (result.upsertedCount) {
        upserted += 1;
      } else if (result.modifiedCount || result.matchedCount) {
        updated += 1;
      }
    }

    console.log(`Import complete. Upserted: ${upserted}, updated: ${updated}, skipped: ${skipped}, name conflicts: ${nameConflicts}`);
  } catch (error) {
    console.error('Error importing products:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
