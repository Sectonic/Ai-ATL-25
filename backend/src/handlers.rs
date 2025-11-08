//! HTTP Request Handlers
//!
//! This module contains all HTTP request handlers for the API endpoints.
//! Handlers receive requests, call the appropriate business logic, and return responses.

use crate::azure;
use crate::types::SimulationRequest;
use actix_web::{HttpResponse, Result, web};

/// Simulates the impact of a city policy proposal
///
/// This endpoint receives a policy proposal along with current city metrics and
/// neighborhood data, then uses AI to generate realistic simulation results.
///
/// ## Request
///
/// The request includes:
/// - `prompt`: The policy proposal text (e.g., "Build a new light rail line")
/// - `cityMetrics`: Current city-wide metrics (population, income, unemployment, etc.)
/// - `selectedZones`: Optional list of specific zones to focus on
/// - `neighborhoodProperties`: Optional neighborhood demographic data
///
/// ## Response
///
/// Returns a Server-Sent Events (SSE) stream of simulation chunks:
/// - `event`: Individual events that occur (traffic, housing, economic, etc.)
///   Each event includes a combined metrics object with both zone-level and city-wide metrics
/// - `complete`: Final summary of the simulation
///
/// ## Example
///
/// ```bash
/// curl -X POST http://localhost:8080/api/simulate \
///   -H "Content-Type: application/json" \
///   -d '{"prompt": "Build light rail", "cityMetrics": {...}}'
/// ```
pub async fn simulate_policy(body: web::Json<SimulationRequest>) -> Result<HttpResponse> {
    let request = body.into_inner();

    eprintln!("\n=== INCOMING SIMULATION REQUEST ===");
    eprintln!("Prompt: {}", request.prompt);
    eprintln!("Selected Zones: {:?}", request.selected_zones);
    eprintln!(
        "Neighborhood Properties Count: {}",
        request.neighborhood_properties.len()
    );
    eprintln!("=== END REQUEST INFO ===\n");

    let stream = azure::generate_simulation(request).await?;

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .append_header(("Cache-Control", "no-cache"))
        .append_header(("Connection", "keep-alive"))
        .streaming(stream))
}
