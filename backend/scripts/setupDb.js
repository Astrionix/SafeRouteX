import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_URL = 'postgresql://postgres:password@localhost:5432/saferoutex';

async function tryConnect(connectionString) {
    console.log(`Trying to connect to: ${connectionString.replace(/:[^:@]*@/, ':****@')} ...`);
    const pool = new Pool({
        connectionString,
        ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
    });
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connection successful!');
        return pool;
    } catch (err) {
        console.log(`❌ Connection failed: ${err.message}`);
        await pool.end();
        return null;
    }
}

async function setup() {
    let pool = await tryConnect(process.env.DATABASE_URL);
    if (!pool) {
        console.log('⚠️ Primary DB connection failed. Trying local fallback...');
        pool = await tryConnect(LOCAL_DB_URL);
    }

    if (!pool) {
        console.error('⛔ FATAL: Could not connect to any database. Please check your .env file or ensure PostgreSQL is running locally.');
        process.exit(1);
    }

    try {
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        console.log('Reading schema from:', schemaPath);
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await pool.query(schema);
        console.log('✅ Schema applied successfully');
    } catch (err) {
        console.error('❌ Error applying schema:', err);
    } finally {
        await pool.end();
    }
}

setup();
