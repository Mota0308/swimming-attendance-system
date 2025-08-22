const { MongoClient } = require('mongodb');

// Use same defaults as server.js
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';
const COLLECTION = 'Location_club';

async function run() {
	const client = new MongoClient(MONGO_URI);
	try {
		await client.connect();
		const db = client.db(DB_NAME);
		const col = db.collection(COLLECTION);

		// Seed data definitions
		const locations = ['堅尼地城','維園','美孚','觀塘','九龍公園'];
		const SH_locations = ['堅尼地城','維園','美孚','觀塘','九龍公園'];
		const BT_locations = ['堅尼地城','維園','美孚','觀塘','九龍公園','上門'];
		const HPP_locations = ['美孚'];

		// Build pairs (location, club)
		const docs = [];
		SH_locations.forEach(loc => docs.push({ location: loc, club: 'SH' }));
		BT_locations.forEach(loc => docs.push({ location: loc, club: 'BT' }));
		HPP_locations.forEach(loc => docs.push({ location: loc, club: 'HPP' }));

		// Upsert each mapping
		const ops = docs.map(d => ({
			updateOne: {
				filter: { location: d.location, club: d.club },
				update: { $set: { location: d.location, club: d.club, updatedAt: new Date() } },
				upsert: true
			}
		}
		));
		if (ops.length) await col.bulkWrite(ops);
		console.log(`✅ Seeded ${ops.length} location-club mappings into ${DB_NAME}.${COLLECTION}`);
	} catch (e) {
		console.error('❌ Seeding Location_club failed:', e);
		process.exitCode = 1;
	} finally {
		await client.close();
	}
}

run(); 