-- SafeRouteX Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/hvrcymiizmmmkkzfbxxvh/sql)

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ⚠️ FORCE CLEANUP: Drop tables to ensure columns are created correctly ⚠️
DROP TABLE IF EXISTS public.sos_tracking CASCADE;
DROP TABLE IF EXISTS public.sos_events CASCADE;
DROP TABLE IF EXISTS public.user_reports CASCADE;
DROP TABLE IF EXISTS public.crime_incidents CASCADE;
DROP TABLE IF EXISTS public.streetlights CASCADE;
DROP TABLE IF EXISTS public.cctv CASCADE;
DROP TABLE IF EXISTS public.roads CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
-- DROP TABLE IF EXISTS public.user_profiles CASCADE; -- Optional: Keep profiles if you want to retain users

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'police')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS events
CREATE TABLE IF NOT EXISTS public.sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    location GEOMETRY(Point, 4326),
    address TEXT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    resolved_by UUID REFERENCES public.user_profiles(id),
    resolution_note TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- SOS tracking points
CREATE TABLE IF NOT EXISTS public.sos_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.sos_events(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326),
    accuracy FLOAT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crime incidents
CREATE TABLE IF NOT EXISTS public.crime_incidents (
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

-- Streetlights
CREATE TABLE IF NOT EXISTS public.streetlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'broken', 'maintenance')),
    wattage INTEGER,
    osm_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CCTV cameras
CREATE TABLE IF NOT EXISTS public.cctv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'offline', 'maintenance')),
    coverage_radius FLOAT DEFAULT 50,
    owner VARCHAR(100),
    osm_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roads with safety scores
CREATE TABLE IF NOT EXISTS public.roads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    osm_id BIGINT,
    name VARCHAR(255),
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    road_type VARCHAR(50),
    length_m FLOAT,
    cctv_density FLOAT DEFAULT 0,
    light_density FLOAT DEFAULT 0,
    crime_density FLOAT DEFAULT 0,
    safety_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User reports
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.user_profiles(id),
    type VARCHAR(50) NOT NULL,
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'resolved')),
    verified_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for spatial queries
CREATE INDEX IF NOT EXISTS idx_sos_events_location ON public.sos_events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_location ON public.crime_incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_streetlights_location ON public.streetlights USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_cctv_location ON public.cctv USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_roads_geometry ON public.roads USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_user_reports_location ON public.user_reports USING GIST(location);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON public.sos_events(status);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_type ON public.crime_incidents(type);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);

-- Row Level Security Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crime_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streetlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Public read for infrastructure data
CREATE POLICY "CCTV is publicly readable" ON public.cctv FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Streetlights are publicly readable" ON public.streetlights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Roads are publicly readable" ON public.roads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Crime incidents are publicly readable" ON public.crime_incidents FOR SELECT TO anon, authenticated USING (true);

-- SOS policies
CREATE POLICY "Users can create SOS" ON public.sos_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own SOS" ON public.sos_events FOR SELECT USING (auth.uid() = user_id);

-- User reports policies
CREATE POLICY "Anyone can create reports" ON public.user_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Reports are publicly readable" ON public.user_reports FOR SELECT USING (true);

-- Service role bypass (for admin operations)
CREATE POLICY "Service role full access user_profiles" ON public.user_profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access sos_events" ON public.sos_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access user_reports" ON public.user_reports FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to calculate safety score
CREATE OR REPLACE FUNCTION calculate_safety_score(
    p_cctv_density FLOAT,
    p_light_density FLOAT,
    p_crime_density FLOAT
) RETURNS FLOAT AS $$
BEGIN
    RETURN GREATEST(0, LEAST(1, 
        (COALESCE(p_cctv_density, 0) * 0.3) + 
        (COALESCE(p_light_density, 0) * 0.3) + 
        ((1 - COALESCE(p_crime_density, 0)) * 0.4)
    ));
END;
$$ LANGUAGE plpgsql;

-- Active SOS view
CREATE OR REPLACE VIEW public.active_sos_view AS
SELECT 
    s.id,
    s.user_id,
    p.name as user_name,
    p.phone as user_phone,
    ST_X(s.location::geometry) as lon,
    ST_Y(s.location::geometry) as lat,
    s.message,
    s.started_at
FROM public.sos_events s
JOIN public.user_profiles p ON s.user_id = p.id
WHERE s.status = 'active';

-- Insert sample crime data for demo
INSERT INTO public.crime_incidents (type, severity, description, location, occurred_at, verified, source)
SELECT 
    (ARRAY['robbery', 'harassment', 'theft', 'assault', 'vandalism'])[floor(random() * 5 + 1)],
    floor(random() * 5 + 1)::int,
    'Sample crime incident for demo',
    ST_SetSRID(ST_MakePoint(
        77.5946 + (random() - 0.5) * 0.1,
        12.9716 + (random() - 0.5) * 0.1
    ), 4326),
    NOW() - (random() * 365 * INTERVAL '1 day'),
    true,
    'imported'
FROM generate_series(1, 50);

COMMENT ON TABLE public.user_profiles IS 'User profiles extending Supabase auth';
COMMENT ON TABLE public.sos_events IS 'Emergency SOS events with real-time tracking';
COMMENT ON TABLE public.crime_incidents IS 'Historical crime data for safety scoring';
COMMENT ON TABLE public.streetlights IS 'Streetlight locations and status';
COMMENT ON TABLE public.cctv IS 'CCTV camera locations and status';
COMMENT ON TABLE public.roads IS 'Road network with pre-computed safety scores';
