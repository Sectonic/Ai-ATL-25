//! City Simulation Backend API
//!
//! This backend provides an AI-powered city policy simulation service. It receives policy
//! proposals from the frontend and uses Azure AI to generate realistic simulation results
//! showing the impact of those policies on neighborhoods, zones, and city-wide metrics.
//!
//! ## Architecture
//!
//! - `handlers.rs`: HTTP request handlers for API endpoints
//! - `azure.rs`: Azure AI integration for generating simulations
//! - `types.rs`: Data structures for requests, responses, and city data
//!
//! ## API Endpoints
//!
//! - `POST /api/simulate`: Streams simulation results for a given policy proposal

mod azure;
mod handlers;
mod types;

use actix_web::{App, HttpServer, web};
use actix_cors::Cors;
use std::path::PathBuf;

/// Loads environment variables from .env files
///
/// Checks for .env files in:
/// 1. Current directory
/// 2. backend/.env
/// 3. Falls back to standard dotenv behavior
fn load_env() {
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let current_env = current_dir.join(".env");
    let backend_env = current_dir.join("backend").join(".env");

    if current_env.exists() && dotenv::from_path(&current_env).is_ok() {
        return;
    }

    if backend_env.exists() && dotenv::from_path(&backend_env).is_ok() {
        return;
    }

    dotenv::dotenv().ok();
}

/// Main entry point for the backend server
///
/// Sets up the Actix-web HTTP server with the simulation endpoint.
/// The server listens on localhost:8080 and provides a single endpoint
/// for policy simulation.
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    load_env();
    
    eprintln!("\n╔════════════════════════════════════════════════════════════╗");
    eprintln!("║   City Simulation Backend API                              ║");
    eprintln!("╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!("🚀 Server starting on http://localhost:8080");
    eprintln!();
    eprintln!("📡 Available endpoints:");
    eprintln!("   POST /api/simulate - Simulate city policy impacts");
    eprintln!();
    eprintln!("🔑 Environment check:");
    match std::env::var("AZURE_API_KEY") {
        Ok(_) => eprintln!("   ✓ AZURE_API_KEY is set"),
        Err(_) => eprintln!("   ✗ AZURE_API_KEY is NOT set (required for AI features)"),
    }
    eprintln!();
    eprintln!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    eprintln!("Waiting for requests...\n");

    HttpServer::new(move || {
        let cors = Cors::permissive();
        
        App::new()
            .wrap(cors)
            .service(
            web::scope("/api").route("/simulate", web::post().to(handlers::simulate_policy)),
        )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
