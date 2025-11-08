mod handlers;

use actix_web::{App, HttpServer, web};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server is running on port http://localhost:8080");

    HttpServer::new(move || {
        App::new().service(web::scope("/api").route(
            "/process-geo-data",
            web::post().to(handlers::process_geo_data),
        ))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
