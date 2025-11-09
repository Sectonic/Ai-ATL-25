//! HTTP Request Handlers
//!
//! This module contains all HTTP request handlers for the API endpoints.
//! Handlers receive requests, call the appropriate business logic, and return responses.

use crate::azure;
use crate::neighborhoods::NeighborhoodDatabase;
use crate::types::SimulationRequest;
use actix_web::{HttpResponse, Result, web};

/// Simulates the impact of a city policy proposal using a two-phase approach
///
/// This endpoint receives a policy proposal along with neighborhood data,
/// then uses Azure AI in two phases to generate realistic simulation results:
/// - Phase 1: Uses minimal context to identify target neighborhoods
/// - Phase 2: Uses full properties for identified neighborhoods to generate events
///
/// ## Request
///
/// The request includes:
/// - `prompt`: The policy proposal text (e.g., "Build a new light rail line")
/// - `selectedZones`: Optional list of specific neighborhood names to focus on
/// - `neighborhoodContext`: Minimal context (name + contextual fields) for Phase 1
/// - `neighborhoodProperties`: Full properties for Phase 2 lookup
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
pub async fn simulate_policy(
    body: web::Json<SimulationRequest>,
    db: web::Data<NeighborhoodDatabase>,
) -> Result<HttpResponse> {
    let request = body.into_inner();

    let zones_text = if request.selected_zones.is_empty() {
        "All".to_string()
    } else {
        format!("{} zones", request.selected_zones.len())
    };

    eprintln!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    eprintln!("📥 Simulation Request");
    eprintln!("   Policy: {}", request.prompt);
    eprintln!("   Selected Zones: {}", zones_text);
    eprintln!(
        "   Context: {} neighborhoods",
        request.neighborhood_context.len()
    );
    eprintln!(
        "   Properties: {} neighborhoods",
        request.neighborhood_properties.len()
    );
    eprintln!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let stream = azure::generate_simulation(request, std::sync::Arc::new(db.get_ref().clone())).await?;

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .append_header(("Cache-Control", "no-cache"))
        .append_header(("Connection", "keep-alive"))
        .streaming(stream))
}
