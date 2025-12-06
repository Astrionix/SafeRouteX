-- SafeRouteX Database Schema
-- PostgreSQL + PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing tables if they exist (for clean reset)
DROP TABLE IF EXISTS sos_tracking CASCADE;
DROP TABLE IF EXISTS sos_events CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS crime_incidents CASCADE;
DROP TABLE IF EXISTS streetlights CASCADE;
DROP TABLE IF EXISTS cctv CASCADE;
DROP TABLE IF EXISTS roads CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'police')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- EMERGENCY CONTACTS TABLE
-- ============================================
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- ============================================
-- SOS EVENTS TABLE
-- ============================================
CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    responded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_events_user ON sos_events(user_id);
CREATE INDEX idx_sos_events_status ON sos_events(status);
CREATE INDEX idx_sos_events_started ON sos_events(started_at DESC);

-- ============================================
-- SOS TRACKING TABLE
-- ============================================
CREATE TABLE sos_tracking (
    id SERIAL PRIMARY KEY,
    sos_id UUID REFERENCES sos_events(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    accuracy FLOAT,
    speed FLOAT,
    heading FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_tracking_sos ON sos_tracking(sos_id);
CREATE INDEX idx_sos_tracking_time ON sos_tracking(timestamp DESC);
CREATE INDEX idx_sos_tracking_location ON sos_tracking USING GIST(location);

-- ============================================
-- CRIME INCIDENTS TABLE
-- ============================================
CREATE TABLE crime_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('robbery', 'harassment', 'assault', 'theft', 'vandalism', 'other')),
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'official' CHECK (source IN ('official', 'user_report', 'imported'))
);

CREATE INDEX idx_crime_type ON crime_incidents(type);
CREATE INDEX idx_crime_severity ON crime_incidents(severity);
CREATE INDEX idx_crime_location ON crime_incidents USING GIST(location);
CREATE INDEX idx_crime_occurred ON crime_incidents(occurred_at DESC);

-- ============================================
-- STREETLIGHTS TABLE
-- ============================================
CREATE TABLE streetlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'broken', 'missing', 'under_repair')),
    wattage INTEGER,
    installed_at DATE,
    last_maintenance DATE,
    reported_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_streetlights_status ON streetlights(status);
CREATE INDEX idx_streetlights_location ON streetlights USING GIST(location);

-- ============================================
-- CCTV CAMERAS TABLE
-- ============================================
CREATE TABLE cctv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'offline', 'maintenance', 'broken')),
    coverage_radius INTEGER DEFAULT 50, -- meters
    owner VARCHAR(50) DEFAULT 'government' CHECK (owner IN ('government', 'private', 'commercial')),
    installed_at DATE,
    last_check DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cctv_status ON cctv(status);
CREATE INDEX idx_cctv_location ON cctv USING GIST(location);

-- ============================================
-- ROADS TABLE (Graph for routing)
-- ============================================
CREATE TABLE roads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    osm_id BIGINT,
    name VARCHAR(255),
    road_type VARCHAR(50),
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    length_meters FLOAT,
    oneway BOOLEAN DEFAULT FALSE,
    max_speed INTEGER,
    surface VARCHAR(50),
    lit BOOLEAN,
    -- Pre-computed safety metrics (updated periodically)
    cctv_density FLOAT DEFAULT 0,
    light_density FLOAT DEFAULT 0,
    crime_density FLOAT DEFAULT 0,
    safety_score FLOAT DEFAULT 0.5,
    -- Graph connectivity
    start_node BIGINT,
    end_node BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roads_osm ON roads(osm_id);
CREATE INDEX idx_roads_type ON roads(road_type);
CREATE INDEX idx_roads_geometry ON roads USING GIST(geometry);
CREATE INDEX idx_roads_safety ON roads(safety_score);
CREATE INDEX idx_roads_start_node ON roads(start_node);
CREATE INDEX idx_roads_end_node ON roads(end_node);

-- Cluster for faster spatial queries
CLUSTER roads USING idx_roads_geometry;

-- ============================================
-- USER REPORTS TABLE
-- ============================================
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('unsafe_street', 'harassment', 'robbery', 'dark_street', 'missing_streetlight', 'broken_cctv', 'other')),
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    media_urls TEXT[], -- Array of image/video URLs
    verified_status VARCHAR(20) DEFAULT 'pending' CHECK (verified_status IN ('pending', 'verified', 'rejected', 'investigating')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    toxicity_score FLOAT, -- NLP toxicity filter score
    sentiment VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_reports_user ON user_reports(user_id);
CREATE INDEX idx_user_reports_type ON user_reports(type);
CREATE INDEX idx_user_reports_status ON user_reports(verified_status);
CREATE INDEX idx_user_reports_location ON user_reports USING GIST(location);
CREATE INDEX idx_user_reports_created ON user_reports(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update safety scores for roads
CREATE OR REPLACE FUNCTION update_road_safety_scores()
RETURNS void AS $$
DECLARE
    buffer_distance FLOAT := 100; -- 100 meters
BEGIN
    UPDATE roads r SET
        cctv_density = COALESCE((
            SELECT COUNT(*)::FLOAT / GREATEST(r.length_meters / 100, 1)
            FROM cctv c
            WHERE c.status = 'operational'
            AND ST_DWithin(r.geometry::geography, c.location::geography, buffer_distance)
        ), 0),
        light_density = COALESCE((
            SELECT COUNT(*)::FLOAT / GREATEST(r.length_meters / 100, 1)
            FROM streetlights s
            WHERE s.status = 'operational'
            AND ST_DWithin(r.geometry::geography, s.location::geography, buffer_distance)
        ), 0),
        crime_density = COALESCE((
            SELECT SUM(ci.severity)::FLOAT / GREATEST(r.length_meters / 100, 1)
            FROM crime_incidents ci
            WHERE ci.occurred_at > NOW() - INTERVAL '1 year'
            AND ST_DWithin(r.geometry::geography, ci.location::geography, buffer_distance)
        ), 0),
        updated_at = NOW();

    -- Calculate normalized safety score
    UPDATE roads SET
        safety_score = GREATEST(0.1, LEAST(1.0,
            0.3 * LEAST(cctv_density / NULLIF((SELECT MAX(cctv_density) FROM roads), 0), 1) +
            0.3 * LEAST(light_density / NULLIF((SELECT MAX(light_density) FROM roads), 0), 1) -
            0.4 * LEAST(crime_density / NULLIF((SELECT MAX(crime_density) FROM roads), 0), 1) +
            0.5  -- Base score
        ));
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest road segment to a point
CREATE OR REPLACE FUNCTION find_nearest_road(
    lat FLOAT,
    lon FLOAT,
    max_distance FLOAT DEFAULT 100
)
RETURNS TABLE(road_id UUID, distance FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, ST_Distance(r.geometry::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) as dist
    FROM roads r
    WHERE ST_DWithin(r.geometry::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, max_distance)
    ORDER BY dist
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get safety statistics for a bounding box
CREATE OR REPLACE FUNCTION get_safety_stats(
    min_lat FLOAT,
    min_lon FLOAT,
    max_lat FLOAT,
    max_lon FLOAT
)
RETURNS TABLE(
    total_crimes BIGINT,
    total_cctv BIGINT,
    total_streetlights BIGINT,
    broken_streetlights BIGINT,
    avg_safety_score FLOAT
) AS $$
DECLARE
    bbox GEOMETRY;
BEGIN
    bbox := ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);
    
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM crime_incidents WHERE ST_Within(location, bbox) AND occurred_at > NOW() - INTERVAL '1 year'),
        (SELECT COUNT(*) FROM cctv WHERE ST_Within(location, bbox) AND status = 'operational'),
        (SELECT COUNT(*) FROM streetlights WHERE ST_Within(location, bbox)),
        (SELECT COUNT(*) FROM streetlights WHERE ST_Within(location, bbox) AND status != 'operational'),
        (SELECT AVG(safety_score) FROM roads WHERE ST_Intersects(geometry, bbox));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active SOS view with latest location
CREATE OR REPLACE VIEW active_sos_view AS
SELECT 
    se.id as sos_id,
    se.user_id,
    u.name as user_name,
    u.phone as user_phone,
    se.started_at,
    st.location,
    ST_Y(st.location) as lat,
    ST_X(st.location) as lon,
    st.timestamp as last_update,
    st.accuracy,
    st.speed
FROM sos_events se
JOIN users u ON se.user_id = u.id
LEFT JOIN LATERAL (
    SELECT * FROM sos_tracking
    WHERE sos_id = se.id
    ORDER BY timestamp DESC
    LIMIT 1
) st ON true
WHERE se.status = 'active';

-- Crime heatmap data view
CREATE OR REPLACE VIEW crime_heatmap_view AS
SELECT 
    ST_Y(location) as lat,
    ST_X(location) as lon,
    severity,
    type,
    occurred_at
FROM crime_incidents
WHERE occurred_at > NOW() - INTERVAL '1 year'
AND verified = true;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_roads_timestamp
    BEFORE UPDATE ON roads
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_reports_timestamp
    BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample users
INSERT INTO users (firebase_uid, email, name, phone, role) VALUES
('admin-001', 'admin@saferoutex.com', 'Admin User', '+1234567890', 'admin'),
('police-001', 'police@saferoutex.com', 'Officer Smith', '+1234567891', 'police'),
('user-001', 'user@example.com', 'John Doe', '+1234567892', 'user');

-- Insert sample CCTV cameras (around a sample area - adjust coordinates for your city)
INSERT INTO cctv (location, status, coverage_radius) VALUES
(ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 'operational', 50),
(ST_SetSRID(ST_MakePoint(-122.4180, 37.7740), 4326), 'operational', 50),
(ST_SetSRID(ST_MakePoint(-122.4200, 37.7760), 4326), 'offline', 50),
(ST_SetSRID(ST_MakePoint(-122.4210, 37.7755), 4326), 'operational', 75);

-- Insert sample streetlights
INSERT INTO streetlights (location, status, wattage) VALUES
(ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 'operational', 100),
(ST_SetSRID(ST_MakePoint(-122.4185, 37.7745), 4326), 'operational', 100),
(ST_SetSRID(ST_MakePoint(-122.4175, 37.7742), 4326), 'broken', 100),
(ST_SetSRID(ST_MakePoint(-122.4195, 37.7755), 4326), 'operational', 150),
(ST_SetSRID(ST_MakePoint(-122.4205, 37.7760), 4326), 'missing', 100);

-- Insert sample crime incidents
INSERT INTO crime_incidents (type, severity, description, location, occurred_at, verified, source) VALUES
('robbery', 4, 'Street robbery reported', ST_SetSRID(ST_MakePoint(-122.4190, 37.7745), 4326), NOW() - INTERVAL '7 days', true, 'official'),
('harassment', 3, 'Verbal harassment incident', ST_SetSRID(ST_MakePoint(-122.4178, 37.7738), 4326), NOW() - INTERVAL '14 days', true, 'official'),
('theft', 2, 'Bicycle theft', ST_SetSRID(ST_MakePoint(-122.4202, 37.7752), 4326), NOW() - INTERVAL '30 days', true, 'official'),
('assault', 5, 'Physical assault case', ST_SetSRID(ST_MakePoint(-122.4188, 37.7762), 4326), NOW() - INTERVAL '3 days', true, 'official');

-- Insert sample road (simplified - in production, import from OSM)
INSERT INTO roads (osm_id, name, road_type, geometry, length_meters, lit, start_node, end_node) VALUES
(1001, 'Main Street', 'primary', ST_SetSRID(ST_MakeLine(ST_MakePoint(-122.4220, 37.7730), ST_MakePoint(-122.4170, 37.7770)), 4326), 600, true, 1, 2),
(1002, 'Oak Avenue', 'secondary', ST_SetSRID(ST_MakeLine(ST_MakePoint(-122.4170, 37.7770), ST_MakePoint(-122.4150, 37.7750)), 4326), 300, true, 2, 3),
(1003, 'Dark Alley', 'residential', ST_SetSRID(ST_MakeLine(ST_MakePoint(-122.4195, 37.7745), ST_MakePoint(-122.4185, 37.7735)), 4326), 150, false, 4, 5);

COMMENT ON TABLE users IS 'User accounts with roles (user, admin, police)';
COMMENT ON TABLE sos_events IS 'SOS emergency events initiated by users';
COMMENT ON TABLE sos_tracking IS 'Real-time location tracking for active SOS events';
COMMENT ON TABLE crime_incidents IS 'Crime incident records from official and user sources';
COMMENT ON TABLE streetlights IS 'Streetlight infrastructure with operational status';
COMMENT ON TABLE cctv IS 'CCTV camera locations and status';
COMMENT ON TABLE roads IS 'Road network graph for routing with safety scores';
COMMENT ON TABLE user_reports IS 'User-submitted incident and safety reports';
