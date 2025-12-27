import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/saferoutex',
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

// Import CCTV data from GeoJSON
async function importCCTV() {
    const dataPath = path.join(__dirname, '../../data/cctv_india.geojson');

    if (!fs.existsSync(dataPath)) {
        console.log('CCTV data file not found at:', dataPath);
        return;
    }

    console.log('📍 Loading CCTV data...');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let imported = 0;
    let skipped = 0;

    for (const feature of data.features) {
        try {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;

            // Determine status based on properties
            let status = 'operational';
            if (props.surveillance === 'outdoor' || props.surveillance === 'public') {
                status = 'operational';
            }

            // Determine owner
            let owner = 'government';
            if (props.operator?.toLowerCase().includes('private')) {
                owner = 'private';
            }

            await pool.query(`
        INSERT INTO cctv (location, status, coverage_radius, owner)
        VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [coords[0], coords[1], status, 50, owner]);

            imported++;
        } catch (error) {
            skipped++;
        }
    }

    console.log(`✅ CCTV Import complete: ${imported} imported, ${skipped} skipped`);
}

// Import Streetlight data from GeoJSON
async function importStreetlights() {
    const dataPath = path.join(__dirname, '../../data/streetlights_india.geojson');

    if (!fs.existsSync(dataPath)) {
        console.log('Streetlight data file not found at:', dataPath);
        return;
    }

    console.log('💡 Loading Streetlight data...');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let imported = 0;
    let skipped = 0;

    for (const feature of data.features) {
        try {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;

            // Determine status
            let status = 'operational';
            const otherTags = props.other_tags || '';
            if (otherTags.includes('"working"=>"no"')) {
                status = 'broken';
            }

            // Determine wattage from lamp_type
            let wattage = 100;
            if (otherTags.includes('led')) {
                wattage = 50;
            } else if (otherTags.includes('sodium')) {
                wattage = 150;
            }

            await pool.query(`
        INSERT INTO streetlights (location, status, wattage)
        VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4)
        ON CONFLICT DO NOTHING
      `, [coords[0], coords[1], status, wattage]);

            imported++;
        } catch (error) {
            skipped++;
        }
    }

    console.log(`✅ Streetlight Import complete: ${imported} imported, ${skipped} skipped`);
}

// Generate sample crime data for demo
async function generateSampleCrimeData() {
    console.log('🚨 Generating sample crime data...');

    // Crime hotspots in Bangalore area
    const crimeTypes = ['robbery', 'harassment', 'theft', 'assault', 'vandalism'];
    const locations = [
        { lat: 12.9716, lon: 77.5946, name: 'Majestic' },
        { lat: 12.9352, lon: 77.6245, name: 'Koramangala' },
        { lat: 12.9698, lon: 77.7500, name: 'Whitefield' },
        { lat: 13.0358, lon: 77.5970, name: 'Hebbal' },
        { lat: 12.9141, lon: 77.6411, name: 'HSR Layout' },
    ];

    let imported = 0;

    for (const loc of locations) {
        // Generate 5-15 crimes per location
        const crimeCount = Math.floor(Math.random() * 10) + 5;

        for (let i = 0; i < crimeCount; i++) {
            const type = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
            const severity = Math.floor(Math.random() * 5) + 1;

            // Random offset within 500m
            const latOffset = (Math.random() - 0.5) * 0.01;
            const lonOffset = (Math.random() - 0.5) * 0.01;

            // Random date within last year
            const daysAgo = Math.floor(Math.random() * 365);
            const occurredAt = new Date();
            occurredAt.setDate(occurredAt.getDate() - daysAgo);

            try {
                await pool.query(`
          INSERT INTO crime_incidents (type, severity, description, location, occurred_at, verified, source)
          VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, true, 'imported')
        `, [type, severity, `${type} incident near ${loc.name}`, loc.lon + lonOffset, loc.lat + latOffset, occurredAt]);

                imported++;
            } catch (error) {
                console.error('Error inserting crime:', error.message);
            }
        }
    }

    console.log(`✅ Crime data generated: ${imported} incidents`);
}

// Main import function
async function main() {
    console.log('🚀 Starting data import...\n');

    try {
        await importCCTV();
        await importStreetlights();
        await generateSampleCrimeData();

        // Update safety scores
        console.log('\n📊 Updating road safety scores...');
        await pool.query('SELECT update_road_safety_scores()');

        console.log('\n✨ Data import complete!');
    } catch (error) {
        console.error('Import error:', error);
    } finally {
        await pool.end();
    }
}

main();
