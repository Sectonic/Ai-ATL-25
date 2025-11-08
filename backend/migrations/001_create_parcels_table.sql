-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create parcels table
CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    objectid INTEGER,
    parcelid VARCHAR(50),
    site_address VARCHAR(255),
    site_city VARCHAR(100),
    site_state VARCHAR(2),
    site_zip VARCHAR(10),
    owner_name1 VARCHAR(255),
    owner_name2 VARCHAR(255),
    council VARCHAR(10),
    npu VARCHAR(10),
    neighborhood VARCHAR(255),
    zoning1 VARCHAR(50),
    zoning2 VARCHAR(50),
    land_value NUMERIC,
    cnt_assd_val NUMERIC,
    tax_year INTEGER,
    -- Store geometry as PostGIS geometry type (not JSON)
    geom GEOMETRY(POLYGON, 4326),  -- 4326 = WGS84 (lat/lng)
    -- Store full properties as JSONB for flexibility
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create GIST spatial index (most important for spatial queries)
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST (geom);

-- Create additional indexes for common filters
CREATE INDEX IF NOT EXISTS idx_parcels_site_address ON parcels (site_address);
CREATE INDEX IF NOT EXISTS idx_parcels_neighborhood ON parcels (neighborhood);
CREATE INDEX IF NOT EXISTS idx_parcels_council ON parcels (council);
CREATE INDEX IF NOT EXISTS idx_parcels_npu ON parcels (npu);
CREATE INDEX IF NOT EXISTS idx_parcels_parcelid ON parcels (parcelid);
CREATE INDEX IF NOT EXISTS idx_parcels_properties ON parcels USING GIN (properties);
CREATE INDEX IF NOT EXISTS idx_parcels_neighborhood_council ON parcels (neighborhood, council);

