use actix_web::{App, HttpResponse, HttpServer, Responder, get, web};

struct AppState {
    app_name: String,
}

#[get("/")]
async fn hello(data: web::Data<AppState>) -> impl Responder {
    HttpResponse::Ok().body(format!("Welcome to {}!", data.app_name))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server is running on port http://localhost:8080");

    HttpServer::new(|| {
        App::new().service(hello).app_data(web::Data::new(AppState {
            app_name: "Actix Web".to_string(),
        }))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
