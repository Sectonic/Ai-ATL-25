//! HTTP Request Handlers
//!
//! This module contains all HTTP request handlers for the API endpoints.
//! Handlers receive requests, call the appropriate business logic, and return responses.

use crate::azure;
use crate::types::SimulationRequest;
use actix_web::web::Bytes;
use actix_web::{HttpResponse, Result, web};
use futures_util::stream;

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
/// - `zoneUpdate`: Updates to specific neighborhood/zone metrics
/// - `metricsUpdate`: City-wide metric changes
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

    // Generate simulation chunks using AI
    let chunks_result = azure::generate_simulation(request).await;

    match chunks_result {
        Ok(chunks) => {
            // Convert the vector of chunks into a streaming response
            // Each chunk is sent as a Server-Sent Event (SSE) with format: "data: {json}\n\n"
            let stream = stream::unfold((chunks, 0usize), move |(chunks, mut index)| async move {
                if index >= chunks.len() {
                    return None;
                }

                let chunk = &chunks[index];
                let json = match serde_json::to_string(chunk) {
                    Ok(json) => json,
                    Err(_) => return None,
                };

                // SSE format: "data: {json}\n\n"
                let data = format!("data: {}\n\n", json);
                index += 1;

                Some((
                    Ok::<_, actix_web::Error>(Bytes::from(data)),
                    (chunks, index),
                ))
            });

            // Return SSE stream with appropriate headers
            Ok(HttpResponse::Ok()
                .content_type("text/event-stream")
                .append_header(("Cache-Control", "no-cache"))
                .append_header(("Connection", "keep-alive"))
                .streaming(stream))
        }
        Err(e) => Err(e),
    }
}
