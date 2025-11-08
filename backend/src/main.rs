mod azure;
mod handlers;
mod types;

use actix_web::{App, HttpServer, web};
use std::path::PathBuf;

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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    load_env();
    println!("Server is running on port http://localhost:8080");

    HttpServer::new(move || {
        App::new().service(
            web::scope("/api")
                .route("/simulate", web::post().to(handlers::simulate_policy)),
        )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
