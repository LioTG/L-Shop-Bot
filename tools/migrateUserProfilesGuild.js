/**
 * One-time migration to drop the old unique index on userId and ensure the new compound
 * index { userId, guildId } exists for per-server economy data.
 *
 * Usage:
 *   1) Set MONGODB_URI in your environment (same as the bot uses).
 *   2) Run: node tools/migrateUserProfilesGuild.js
 */
require('dotenv/config');
const mongoose = require('mongoose');
const UserProfile = require('../schemas/UserProfile');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const indexes = await UserProfile.collection.indexes();
        const hasOldIndex = indexes.some((idx) => idx.name === 'userId_1');

        if (hasOldIndex) {
            console.log('Dropping old unique index on userId...');
            await UserProfile.collection.dropIndex('userId_1');
            console.log('Dropped index userId_1');
        } else {
            console.log('Old userId_1 index not found; nothing to drop.');
        }

        console.log('Syncing indexes to ensure { userId, guildId } unique index...');
        await UserProfile.syncIndexes();
        console.log('Indexes synced successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrate();
