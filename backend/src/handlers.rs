//! HTTP Request Handlers
//!
//! This module contains all HTTP request handlers for the API endpoints.
//! Handlers receive requests, call the appropriate business logic, and return responses.

use crate::azure;
use crate::types::SimulationRequest;
use actix_web::{HttpResponse, Result, web};

/// Simulates the impact of a city policy proposal
///
/// This endpoint receives a policy proposal along with neighborhood data,
/// then uses Azure AI to generate realistic simulation results showing
/// how the policy would affect different neighborhoods.
///
/// ## Request
///
/// The request includes:
/// - `prompt`: The policy proposal text (e.g., "Build a new light rail line")
/// - `selectedZones`: Optional list of specific neighborhood names to focus on
/// - `neighborhoodProperties`: Optional neighborhood demographic and geographic data
///
/// ## Response
///
/// Returns a Server-Sent Events (SSE) stream of simulation chunks:
/// - `event`: Individual events that occur in affected neighborhoods (transportation,
///   housing, economic, etc.). Each event includes optional partial metrics updates
///   showing how the neighborhood changes as a result of the event.
/// - `complete`: Final summary of the simulation results
///
/// ## Example
///
/// ```bash
/// curl -X POST http://localhost:8080/api/simulate \
///   -H "Content-Type: application/json" \
///   -d '{"prompt": "Build light rail connecting downtown to midtown", "selectedZones": ["Downtown", "Midtown"]}'
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
