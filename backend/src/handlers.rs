use actix_web::{HttpResponse, Result, web};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use std::collections::HashMap;

// Query parameters for GET /parcels endpoint
#[derive(Debug, Deserialize)]
pub struct ParcelQueryParams {
    // Bounding box: min_lng, min_lat, max_lng, max_lat
    pub bbox: Option<String>, // Format: "min_lng,min_lat,max_lng,max_lat"
    pub neighborhood: Option<String>,
    pub council: Option<String>,
    pub npu: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// Request body for POST /parcels endpoint
#[derive(Debug, Deserialize)]
pub struct CreateParcelRequest {
    pub feature: serde_json::Value, // Full GeoJSON Feature
}

// Database row structure
#[derive(Debug, Serialize, Deserialize, FromRow)]
struct ParcelRow {
    id: i32,
    objectid: Option<i32>,
    parcelid: Option<String>,
    site_address: Option<String>,
    site_city: Option<String>,
    site_state: Option<String>,
    site_zip: Option<String>,
    owner_name1: Option<String>,
    council: Option<String>,
    npu: Option<String>,
    neighborhood: Option<String>,
    land_value: Option<f64>,
    cnt_assd_val: Option<f64>,
    tax_year: Option<i32>,
    #[sqlx(rename = "geometry")]
    geometry: serde_json::Value, // GeoJSON geometry from ST_AsGeoJSON
    properties: Option<serde_json::Value>,
}

// GET /parcels - Query parcels with filters
pub async fn get_parcels(
    query: web::Query<ParcelQueryParams>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let limit = query.limit.unwrap_or(1000).min(5000); // Max 5000
    let offset = query.offset.unwrap_or(0);

    // Parse bounding box if provided
    let bbox = if let Some(bbox_str) = &query.bbox {
        let bbox_values: Result<Vec<f64>, _> = bbox_str
            .split(',')
            .map(|s| s.trim().parse::<f64>())
            .collect();

        match bbox_values {
            Ok(bbox) if bbox.len() == 4 => Some((bbox[0], bbox[1], bbox[2], bbox[3])),
            _ => {
                return Ok(HttpResponse::BadRequest().json(json!({
                    "error": "Invalid bbox format. Expected: min_lng,min_lat,max_lng,max_lat"
                })));
            }
        }
    } else {
        None
    };

    // Build query based on provided filters
    let parcels_result = match (bbox, &query.neighborhood, &query.council, &query.npu) {
        // No filters
        (None, None, None, None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                ORDER BY id
                LIMIT $1 OFFSET $2",
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Only bbox
        (Some((min_lng, min_lat, max_lng, max_lat)), None, None, None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
                ORDER BY id
                LIMIT $5 OFFSET $6",
            )
            .bind(min_lng)
            .bind(min_lat)
            .bind(max_lng)
            .bind(max_lat)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Bbox + neighborhood
        (Some((min_lng, min_lat, max_lng, max_lat)), Some(neighborhood), None, None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
                  AND neighborhood = $5
                ORDER BY id
                LIMIT $6 OFFSET $7",
            )
            .bind(min_lng)
            .bind(min_lat)
            .bind(max_lng)
            .bind(max_lat)
            .bind(neighborhood)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Bbox + council
        (Some((min_lng, min_lat, max_lng, max_lat)), None, Some(council), None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
                  AND council = $5
                ORDER BY id
                LIMIT $6 OFFSET $7",
            )
            .bind(min_lng)
            .bind(min_lat)
            .bind(max_lng)
            .bind(max_lat)
            .bind(council)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Bbox + npu
        (Some((min_lng, min_lat, max_lng, max_lat)), None, None, Some(npu)) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
                  AND npu = $5
                ORDER BY id
                LIMIT $6 OFFSET $7",
            )
            .bind(min_lng)
            .bind(min_lat)
            .bind(max_lng)
            .bind(max_lat)
            .bind(npu)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Only neighborhood
        (None, Some(neighborhood), None, None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE neighborhood = $1
                ORDER BY id
                LIMIT $2 OFFSET $3",
            )
            .bind(neighborhood)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Only council
        (None, None, Some(council), None) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE council = $1
                ORDER BY id
                LIMIT $2 OFFSET $3",
            )
            .bind(council)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Only npu
        (None, None, None, Some(npu)) => {
            sqlx::query_as::<_, ParcelRow>(
                "SELECT 
                    id, objectid, parcelid, site_address, site_city, site_state, site_zip,
                    owner_name1, council, npu, neighborhood, land_value, cnt_assd_val, tax_year,
                    ST_AsGeoJSON(geom)::jsonb as geometry, properties
                FROM parcels
                WHERE npu = $1
                ORDER BY id
                LIMIT $2 OFFSET $3",
            )
            .bind(npu)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await
        }
        // Multiple filters - return error for unsupported combinations
        _ => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "error": "Complex filter combinations not fully supported yet. Please use bbox with at most one additional filter (neighborhood, council, or npu)."
            })));
        }
    };

    let parcels = match parcels_result {
        Ok(rows) => rows,
        Err(e) => {
            eprintln!("Database error: {}", e);
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Database query failed",
                "details": e.to_string()
            })));
        }
    };

    // Convert to GeoJSON FeatureCollection
    let features: Vec<serde_json::Value> = parcels
        .into_iter()
        .map(|parcel| {
            let mut props = HashMap::new();

            if let Some(objectid) = parcel.objectid {
                props.insert("OBJECTID".to_string(), json!(objectid));
            }
            if let Some(ref parcelid) = parcel.parcelid {
                props.insert("PARCELID".to_string(), json!(parcelid));
            }
            if let Some(ref address) = parcel.site_address {
                props.insert("SITEADDRESS".to_string(), json!(address));
            }
            if let Some(ref city) = parcel.site_city {
                props.insert("SITECITY".to_string(), json!(city));
            }
            if let Some(ref state) = parcel.site_state {
                props.insert("SITESTATE".to_string(), json!(state));
            }
            if let Some(ref zip) = parcel.site_zip {
                props.insert("SITEZIP".to_string(), json!(zip));
            }
            if let Some(ref owner) = parcel.owner_name1 {
                props.insert("OWNERNME1".to_string(), json!(owner));
            }
            if let Some(ref council) = parcel.council {
                props.insert("COUNCIL".to_string(), json!(council));
            }
            if let Some(ref npu) = parcel.npu {
                props.insert("NPU".to_string(), json!(npu));
            }
            if let Some(ref neighborhood) = parcel.neighborhood {
                props.insert("NEIGHBORHOOD".to_string(), json!(neighborhood));
            }
            if let Some(land_value) = parcel.land_value {
                props.insert("LNDVALUE".to_string(), json!(land_value));
            }
            if let Some(cnt_assd_val) = parcel.cnt_assd_val {
                props.insert("CNTASSDVAL".to_string(), json!(cnt_assd_val));
            }
            if let Some(tax_year) = parcel.tax_year {
                props.insert("TAXYEAR".to_string(), json!(tax_year));
            }

            // Merge with properties JSONB if it exists
            if let Some(ref properties) = parcel.properties {
                if let Some(props_obj) = properties.as_object() {
                    for (key, value) in props_obj {
                        props.insert(key.clone(), value.clone());
                    }
                }
            }

            json!({
                "type": "Feature",
                "id": parcel.id,
                "geometry": parcel.geometry,
                "properties": props
            })
        })
        .collect();

    let feature_collection = json!({
        "type": "FeatureCollection",
        "features": features
    });

    Ok(HttpResponse::Ok().json(feature_collection))
}

// POST /parcels - Insert a new parcel from GeoJSON Feature
pub async fn create_parcel(
    body: web::Json<CreateParcelRequest>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let feature = &body.feature;

    // Validate GeoJSON Feature structure
    if feature.get("type").and_then(|t| t.as_str()) != Some("Feature") {
        return Ok(HttpResponse::BadRequest().json(json!({
            "error": "Expected GeoJSON Feature type"
        })));
    }

    let geometry = match feature.get("geometry") {
        Some(geom) => geom,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "error": "Missing geometry in Feature"
            })));
        }
    };

    let properties = feature
        .get("properties")
        .map(|p| p.clone())
        .unwrap_or_else(|| json!({}));

    // Extract common properties
    let objectid = properties
        .get("OBJECTID")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let parcelid = properties
        .get("PARCELID")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let site_address = properties
        .get("SITEADDRESS")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string());
    let site_city = properties
        .get("SITECITY")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let site_state = properties
        .get("SITESTATE")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let site_zip = properties
        .get("SITEZIP")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let owner_name1 = properties
        .get("OWNERNME1")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let council = properties
        .get("COUNCIL")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let npu = properties
        .get("NPU")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let neighborhood = properties
        .get("NEIGHBORHOOD")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let land_value = properties
        .get("LNDVALUE")
        .and_then(|v| v.as_f64())
        .or_else(|| {
            properties
                .get("LNDVALUE")
                .and_then(|v| v.as_i64())
                .map(|v| v as f64)
        });
    let cnt_assd_val = properties
        .get("CNTASSDVAL")
        .and_then(|v| v.as_f64())
        .or_else(|| {
            properties
                .get("CNTASSDVAL")
                .and_then(|v| v.as_i64())
                .map(|v| v as f64)
        });
    let tax_year = properties
        .get("TAXYEAR")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    // Convert geometry to PostGIS format
    let geometry_json = match serde_json::to_string(geometry) {
        Ok(json) => json,
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to serialize geometry"
            })));
        }
    };

    // Insert into database
    let result = sqlx::query(
        r#"
        INSERT INTO parcels (
            objectid, parcelid, site_address, site_city, site_state, site_zip,
            owner_name1, council, npu, neighborhood,
            land_value, cnt_assd_val, tax_year,
            geom, properties
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13,
            ST_GeomFromGeoJSON($14), $15
        )
        RETURNING id
        "#,
    )
    .bind(objectid)
    .bind(&parcelid)
    .bind(&site_address)
    .bind(&site_city)
    .bind(&site_state)
    .bind(&site_zip)
    .bind(&owner_name1)
    .bind(&council)
    .bind(&npu)
    .bind(&neighborhood)
    .bind(land_value)
    .bind(cnt_assd_val)
    .bind(tax_year)
    .bind(&geometry_json)
    .bind(properties)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(row) => {
            use sqlx::Row;
            let id: i32 = row.try_get("id").unwrap_or(0);
            Ok(HttpResponse::Created().json(json!({
                "id": id,
                "message": "Parcel created successfully"
            })))
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to create parcel",
                "details": e.to_string()
            })))
        }
    }
}
