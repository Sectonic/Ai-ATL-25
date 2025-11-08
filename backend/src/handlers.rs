use crate::azure;
use actix_web::{HttpResponse, Result, web};

pub async fn chat_completions(
    body: web::Json<azure::ChatCompletionRequest>,
) -> Result<HttpResponse> {
    azure::call_chat_completions(body.into_inner()).await
}
