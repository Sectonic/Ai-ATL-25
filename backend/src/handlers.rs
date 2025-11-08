use actix_web::{HttpResponse, Result, web};
use serde::{Deserialize, Serialize};

// Request body for POST /parcels endpoint
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateProcessRequest {
    pub data: String,
}

// POST /procress
pub async fn process_geo_data(body: web::Json<CreateProcessRequest>) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(&body.data))
}
