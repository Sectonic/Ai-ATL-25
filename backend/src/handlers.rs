use crate::azure;
use crate::types::SimulationRequest;
use actix_web::web::Bytes;
use actix_web::{HttpResponse, Result, web};
use futures_util::stream;

pub async fn simulate_policy(body: web::Json<SimulationRequest>) -> Result<HttpResponse> {
    let request = body.into_inner();

    let chunks_result = azure::generate_simulation(request).await;

    match chunks_result {
        Ok(chunks) => {
            let stream = stream::unfold((chunks, 0usize), move |(chunks, mut index)| async move {
                if index >= chunks.len() {
                    return None;
                }

                let chunk = &chunks[index];
                let json = match serde_json::to_string(chunk) {
                    Ok(json) => json,
                    Err(_) => return None,
                };

                let data = format!("data: {}\n\n", json);
                index += 1;

                Some((
                    Ok::<_, actix_web::Error>(Bytes::from(data)),
                    (chunks, index),
                ))
            });

            Ok(HttpResponse::Ok()
                .content_type("text/event-stream")
                .append_header(("Cache-Control", "no-cache"))
                .append_header(("Connection", "keep-alive"))
                .streaming(stream))
        }
        Err(e) => Err(e),
    }
}
