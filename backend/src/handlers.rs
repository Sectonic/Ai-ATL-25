use crate::azure;
use crate::types::SimulationRequest;
use actix_web::{HttpResponse, Result, web};

pub async fn simulate_policy(body: web::Json<SimulationRequest>) -> Result<HttpResponse> {
    let request = body.into_inner();
    let chunks = azure::generate_simulation(request).await?;

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(chunks))
}
