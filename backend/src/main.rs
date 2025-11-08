mod handlers;

use actix_web::{App, HttpServer, web};
use sqlx::PgPool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server is running on port http://localhost:8080");

    let db = PgPool::connect(&std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"))
        .await
        .expect("Failed to connect to database");

    HttpServer::new(move || {
        App::new().app_data(web::Data::new(db.clone())).service(
            web::scope("/api")
                .route("/parcels", web::get().to(handlers::get_parcels))
                .route("/parcels", web::post().to(handlers::create_parcel)),
        )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
