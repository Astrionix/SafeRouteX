-- RUN THIS IN SUPABASE SQL EDITOR TO FIX TABLE ISSUES

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop existing tables to ensure clean state (avoids column mismatch errors)
DROP TABLE IF EXISTS public.cctv CASCADE;
DROP TABLE IF EXISTS public.streetlights CASCADE;
DROP TABLE IF EXISTS public.crime_incidents CASCADE;
-- Also drop views that depend on them
DROP VIEW IF EXISTS public.crime_heatmap_view;

-- 3. Re-create tables with correct columns matching the import script

-- CCTV cameras
CREATE TABLE public.cctv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'offline', 'maintenance')),
    coverage_radius FLOAT DEFAULT 50,
    owner VARCHAR(100),
    osm_id VARCHAR(50) UNIQUE, -- Added UNIQUE for upsert
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streetlights
CREATE TABLE public.streetlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'broken', 'maintenance')),
    wattage INTEGER,
    osm_id VARCHAR(50) UNIQUE, -- Added UNIQUE for upsert
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crime incidents
CREATE TABLE public.crime_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    severity INTEGER DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    occurred_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT false,
    source VARCHAR(50) DEFAULT 'user_report',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Spatial Indexes (Crucial for performance)
CREATE INDEX idx_cctv_location ON public.cctv USING GIST(location);
CREATE INDEX idx_streetlights_location ON public.streetlights USING GIST(location);
CREATE INDEX idx_crime_incidents_location ON public.crime_incidents USING GIST(location);

-- 5. Enable Row Level Security (RLS) and Public Access
ALTER TABLE public.cctv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streetlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crime_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cctv" ON public.cctv FOR SELECT USING (true);
CREATE POLICY "Public read streetlights" ON public.streetlights FOR SELECT USING (true);
CREATE POLICY "Public read crime" ON public.crime_incidents FOR SELECT USING (true);
