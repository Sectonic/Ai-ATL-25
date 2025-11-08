# Backend API for GeoJSON Parcels

This Rust backend provides endpoints for storing and querying GeoJSON parcel data in PostgreSQL with PostGIS.

## Setup

1. **Install PostGIS extension** in your PostgreSQL database:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

2. **Run the migration** to create the parcels table:
```bash
psql $DATABASE_URL -f migrations/001_create_parcels_table.sql
```

3. **Set environment variable**:
```bash
export DATABASE_URL=postgresql://user:password@localhost/dbname
```

4. **Run the server**:
```bash
cargo run
```

The server will start on `http://localhost:8080`

## API Endpoints

### 1. GET /api/parcels - Query Parcels

Query parcels with optional filters. Returns a GeoJSON FeatureCollection.

**Query Parameters:**
- `bbox` (optional): Bounding box in format `min_lng,min_lat,max_lng,max_lat`
- `neighborhood` (optional): Filter by neighborhood name
- `council` (optional): Filter by council district
- `npu` (optional): Filter by NPU
- `limit` (optional): Maximum number of results (default: 1000, max: 5000)
- `offset` (optional): Pagination offset (default: 0)

**Examples:**

```bash
# Get all parcels (limited to 1000)
curl http://localhost:8080/api/parcels

# Get parcels in a bounding box
curl "http://localhost:8080/api/parcels?bbox=-84.3,33.75,-84.29,33.76"

# Get parcels in a bounding box with neighborhood filter
curl "http://localhost:8080/api/parcels?bbox=-84.3,33.75,-84.29,33.76&neighborhood=East%20Lake"

# Get parcels by council district
curl "http://localhost:8080/api/parcels?council=5"

# With pagination
curl "http://localhost:8080/api/parcels?limit=100&offset=0"
```

**Response Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-84.294, 33.751], ...]]
      },
      "properties": {
        "OBJECTID": 1,
        "PARCELID": "15 203 03 122",
        "SITEADDRESS": "43 OAKRIDGE AVENUE SE",
        "NEIGHBORHOOD": "East Lake",
        ...
      }
    }
  ]
}
```

### 2. POST /api/parcels - Create Parcel

Insert a new parcel from a GeoJSON Feature.

**Request Body:**
```json
{
  "feature": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-84.294, 33.751], ...]]
    },
    "properties": {
      "OBJECTID": 1,
      "PARCELID": "15 203 03 122",
      "SITEADDRESS": "43 OAKRIDGE AVENUE SE",
      "SITECITY": "ATLANTA",
      "SITESTATE": "GA",
      "SITEZIP": "30317",
      "OWNERNME1": "FORBES SCOTT JAMESON",
      "COUNCIL": "5",
      "NPU": "O",
      "NEIGHBORHOOD": "East Lake",
      "LNDVALUE": 0,
      "CNTASSDVAL": 140000,
      "TAXYEAR": 2025
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/parcels \
  -H "Content-Type: application/json" \
  -d '{
    "feature": {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-84.294, 33.751], [-84.294, 33.752], [-84.293, 33.752], [-84.293, 33.751], [-84.294, 33.751]]]
      },
      "properties": {
        "PARCELID": "15 203 03 122",
        "SITEADDRESS": "43 OAKRIDGE AVENUE SE",
        "NEIGHBORHOOD": "East Lake"
      }
    }
  }'
```

**Response:**
```json
{
  "id": 1,
  "message": "Parcel created successfully"
}
```

## Database Schema

The `parcels` table includes:
- Standard columns: id, objectid, parcelid, site_address, etc.
- Geometry column: `geom` (PostGIS GEOMETRY(POLYGON, 4326))
- Properties column: `properties` (JSONB for flexible storage)

**Indexes:**
- GIST spatial index on `geom` (critical for spatial queries)
- Indexes on commonly filtered columns (neighborhood, council, npu, etc.)

## Notes

- The bounding box query uses PostGIS's `&&` operator which is optimized with the GIST index
- Complex filter combinations (bbox + multiple other filters) are currently limited - use bbox with at most one additional filter
- All geometry is stored in WGS84 (EPSG:4326) coordinate system

