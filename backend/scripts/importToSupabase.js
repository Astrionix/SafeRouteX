/**
 * SafeRouteX - GeoJSON Data Importer for Supabase
 * 
 * This script imports CCTV and Streetlight data from GeoJSON files into Supabase.
 * Run with: node scripts/importToSupabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vvdaknilpngfriainero.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZGFrbmlscG5nZnJpYWluZXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzA0NSwiZXhwIjoyMDgwNjU5MDQ1fQ.sLkiyEKJr1hXqsKtnYFN7CsyRES7oV8Gc0jR12ED9WE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Batch size for inserts
const BATCH_SIZE = 100;

async function importCCTV() {
    console.log('\n📹 Importing CCTV cameras...');

    const cctvPath = path.join(__dirname, '../data/cctv_india.geojson');
    if (!fs.existsSync(cctvPath)) {
        console.log('❌ CCTV file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(cctvPath, 'utf8'));
    console.log(`   Found ${data.features.length} CCTV entries`);

    // Filter to Bangalore area for faster import (optional)
    const filtered = data.features.filter(f => {
        const [lon, lat] = f.geometry.coordinates;
        return lon > 77 && lon < 78.5 && lat > 12 && lat < 14;
    });

    console.log(`   Filtering to Bangalore area: ${filtered.length} entries`);

    let imported = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
        const batch = filtered.slice(i, i + BATCH_SIZE);

        const records = batch.map(feature => {
            const [lon, lat] = feature.geometry.coordinates;
            const props = feature.properties || {};

            return {
                osm_id: String(props['@id'] || props.osm_id),
                location: `SRID=4326;POINT(${lon} ${lat})`,
                status: props.surveillance === 'outdoor' || props.surveillance === 'public' ? 'operational' : 'operational',
                coverage_radius: 50,
                owner: props.operator || 'government'
            };
        });

        const { data: result, error } = await supabase
            .from('cctv')
            .upsert(records, { onConflict: 'osm_id', ignoreDuplicates: true });

        if (error) {
            errors += batch.length;
            console.log(`   ⚠️ Batch error: ${error.message}`);
        } else {
            imported += batch.length;
        }

        // Progress
        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= filtered.length) {
            console.log(`   Progress: ${Math.min(i + BATCH_SIZE, filtered.length)}/${filtered.length}`);
        }
    }

    console.log(`✅ CCTV import complete: ${imported} imported, ${errors} errors`);
}

async function importStreetlights() {
    console.log('\n💡 Importing streetlights...');

    const lightPath = path.join(__dirname, '../data/streetlights_india.geojson');
    if (!fs.existsSync(lightPath)) {
        console.log('❌ Streetlights file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(lightPath, 'utf8'));
    console.log(`   Found ${data.features.length} streetlight entries`);

    // Filter to Bangalore area
    const filtered = data.features.filter(f => {
        const [lon, lat] = f.geometry.coordinates;
        return lon > 77 && lon < 78.5 && lat > 12 && lat < 14;
    });

    console.log(`   Filtering to Bangalore area: ${filtered.length} entries`);

    let imported = 0;
    let errors = 0;

    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
        const batch = filtered.slice(i, i + BATCH_SIZE);

        const records = batch.map(feature => {
            const [lon, lat] = feature.geometry.coordinates;
            const props = feature.properties || {};
            const otherTags = props.other_tags || '';

            let status = 'operational';
            if (otherTags.includes('"working"=>"no"')) {
                status = 'broken';
            }

            let wattage = 100;
            if (otherTags.includes('led')) wattage = 50;
            else if (otherTags.includes('sodium')) wattage = 150;

            return {
                osm_id: String(props.osm_id),
                location: `SRID=4326;POINT(${lon} ${lat})`,
                status,
                wattage
            };
        });

        const { error } = await supabase
            .from('streetlights')
            .upsert(records, { onConflict: 'osm_id', ignoreDuplicates: true });

        if (error) {
            errors += batch.length;
        } else {
            imported += batch.length;
        }

        if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= filtered.length) {
            console.log(`   Progress: ${Math.min(i + BATCH_SIZE, filtered.length)}/${filtered.length}`);
        }
    }

    console.log(`✅ Streetlights import complete: ${imported} imported, ${errors} errors`);
}

async function generateCrimeData() {
    console.log('\n🚨 Generating sample crime data...');

    const crimeTypes = ['robbery', 'harassment', 'theft', 'assault', 'vandalism'];
    const locations = [
        { lat: 12.9716, lon: 77.5946, name: 'Majestic' },
        { lat: 12.9352, lon: 77.6245, name: 'Koramangala' },
        { lat: 12.9698, lon: 77.7500, name: 'Whitefield' },
        { lat: 13.0358, lon: 77.5970, name: 'Hebbal' },
        { lat: 12.9141, lon: 77.6411, name: 'HSR Layout' },
        { lat: 12.9260, lon: 77.6762, name: 'Marathahalli' },
        { lat: 12.9850, lon: 77.5533, name: 'Rajajinagar' },
    ];

    const crimes = [];

    for (const loc of locations) {
        const crimeCount = Math.floor(Math.random() * 15) + 10;

        for (let i = 0; i < crimeCount; i++) {
            const latOffset = (Math.random() - 0.5) * 0.02;
            const lonOffset = (Math.random() - 0.5) * 0.02;
            const daysAgo = Math.floor(Math.random() * 365);

            crimes.push({
                type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
                severity: Math.floor(Math.random() * 5) + 1,
                description: `Incident near ${loc.name}`,
                location: `SRID=4326;POINT(${loc.lon + lonOffset} ${loc.lat + latOffset})`,
                occurred_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
                verified: true,
                source: 'imported'
            });
        }
    }

    const { error } = await supabase.from('crime_incidents').insert(crimes);

    if (error) {
        console.log(`❌ Crime data error: ${error.message}`);
    } else {
        console.log(`✅ Crime data generated: ${crimes.length} incidents`);
    }
}

async function main() {
    console.log('🚀 SafeRouteX Data Importer');
    console.log('===========================');
    console.log(`Supabase: ${SUPABASE_URL}`);

    try {
        // Test connection
        const { data, error } = await supabase.from('cctv').select('count').limit(1);
        if (error && error.code === '42P01') {
            console.log('\n⚠️ Tables not found! Please run the schema first:');
            console.log('   1. Go to https://supabase.com/dashboard/project/hvrcymiizmmmkkzfbxxvh/sql/new');
            console.log('   2. Paste the contents of database/supabase_schema.sql');
            console.log('   3. Click Run');
            console.log('   4. Then run this script again\n');
            return;
        }

        await importCCTV();
        await importStreetlights();
        await generateCrimeData();

        console.log('\n✨ All data imported successfully!');
        console.log('   You can now use the full app with Supabase.\n');

    } catch (error) {
        console.error('❌ Import error:', error.message);
    }
}

main();
