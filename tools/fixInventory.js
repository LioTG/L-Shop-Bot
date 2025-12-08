require('dotenv/config');
const mongoose = require('mongoose');
const UserProfile = require('../schemas/UserProfile');
const { Product } = require('../schemas/Product');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Cachea categorías por nombre de producto para rellenar inventarios.
    const products = await Product.find().select('name category');
    const byName = new Map(products.map((p) => [p.name, p.category || 'unknown']));

    const profiles = await UserProfile.find();
    let updated = 0;

    for (const profile of profiles) {
      let changed = false;

      for (const item of profile.inventory) {
        if (!item.category) {
          const category = byName.get(item.name) || 'unknown';
          item.category = category;
          changed = true;
        }
      }

      if (changed) {
        await profile.save();
        updated += 1;
        console.log(`Perfil ${profile.userId} actualizado`);
      }
    }

    console.log(`Inventarios reparados: ${updated}`);
  } catch (error) {
    console.error('Error reparando inventarios:', error);
  } finally {
    await mongoose.disconnect();
  }
})();
