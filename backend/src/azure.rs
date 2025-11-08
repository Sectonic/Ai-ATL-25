use actix_web::HttpResponse;
use actix_web::http::StatusCode;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ContentFilterResult {
    pub filtered: bool,
    pub severity: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ContentFilterResults {
    pub violence: ContentFilterResult,
    pub sexual: ContentFilterResult,
    pub hate: ContentFilterResult,
    pub self_harm: ContentFilterResult,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protected_material_text: Option<ProtectedMaterialText>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProtectedMaterialText {
    pub filtered: bool,
    pub detected: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PromptFilterResult {
    pub prompt_index: u32,
    pub content_filter_results: ContentFilterResults,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Choice {
    pub index: u32,
    pub message: Message,
    pub finish_reason: String,
    pub content_filter_results: ContentFilterResults,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<Choice>,
    pub usage: Usage,
    pub created: u64,
    pub object: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_filter_results: Option<Vec<PromptFilterResult>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatCompletionRequest {
    pub messages: Vec<Message>,
    #[serde(default = "default_true")]
    pub stream: bool,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default)]
    pub presence_penalty: f32,
    #[serde(default)]
    pub frequency_penalty: f32,
    #[serde(default = "default_model")]
    pub model: String,
}

fn default_true() -> bool {
    true
}

fn default_max_tokens() -> u32 {
    200000
}

fn default_temperature() -> f32 {
    0.8
}

fn default_top_p() -> f32 {
    0.1
}

fn default_model() -> String {
    "DeepSeek-V3.1".to_string()
}

pub async fn call_chat_completions(
    request: ChatCompletionRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    let url = "https://aiatlai.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview";

    let client = reqwest::Client::new();

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("Request failed: {}", e))
        })?;

    if request.stream {
        let reqwest_status = response.status();
        let status = StatusCode::from_u16(reqwest_status.as_u16())
            .map_err(|_| actix_web::error::ErrorInternalServerError("Invalid status code"))?;
        let stream = response.bytes_stream().map(|result| {
            result.map_err(|e| {
                actix_web::error::ErrorInternalServerError(format!("Stream error: {}", e))
            })
        });

        Ok(HttpResponse::build(status)
            .content_type("text/event-stream")
            .streaming(stream))
    } else {
        let reqwest_status = response.status();
        let status = StatusCode::from_u16(reqwest_status.as_u16())
            .map_err(|_| actix_web::error::ErrorInternalServerError("Invalid status code"))?;
        let response_body = response.text().await.map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("Failed to read response: {}", e))
        })?;

        Ok(HttpResponse::build(status)
            .content_type("application/json")
            .body(response_body))
    }
}
