use actix_web::{HttpResponse, Result, web};
use serde::{Deserialize, Serialize};

// Request body for POST /parcels endpoint
#[derive(Debug, Deserialize)]
pub struct CreateProcessRequest {
    pub data: serde_json::Value,
}

// POST /procress
pub async fn process_geo_data(body: web::Json<CreateProcessRequest>) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().body("Hello, world!"))
}
