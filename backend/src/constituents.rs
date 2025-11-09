use actix_web::{web, HttpResponse, Error};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize)]
pub struct EventRequest {
    pub title: String,
    pub description: String,
    pub zone: String,
    pub positivity: f64,
    pub severity: f64,
    #[serde(default)]
    pub exclusions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PersonaResponse {
    pub name: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct Persona {
    name: String,
    agent_prompt: String,
    #[allow(dead_code)]
    description: String,
    embeddings: Vec<f64>,
}

#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    input: Vec<String>,
    deployment: String,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f64,
    model: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot_product: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let magnitude_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    dot_product / (magnitude_a * magnitude_b)
}

async fn get_embedding(text: &str, api_key: &str) -> Result<Vec<f64>, Error> {
    let client = reqwest::Client::new();
    let url = "https://aiatlai.cognitiveservices.azure.com/openai/deployments/text-embedding-3-small/embeddings?api-version=2023-05-15";

    let request_body = EmbeddingRequest {
        input: vec![text.to_string()],
        deployment: "text-embedding-3-small".to_string(),
    };

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Embedding API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Embedding API request failed")
        })?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        eprintln!("Embedding API error: {} - {}", status, error_text);
        return Err(actix_web::error::ErrorInternalServerError("Embedding API failed"));
    }

    let embedding_response: EmbeddingResponse = response.json().await.map_err(|e| {
        eprintln!("Failed to parse embedding response: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to parse embedding response")
    })?;

    embedding_response.data
        .first()
        .map(|d| d.embedding.clone())
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No embedding data returned"))
}

async fn generate_persona_response(
    persona: &Persona,
    event: &EventRequest,
    api_key: &str,
) -> Result<String, Error> {
    let client = reqwest::Client::new();
    let url = "https://aiatlai.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview";

    let system_prompt = format!(
        "{}\\n\\nYou are responding as a constituent who just heard about an event in their city. \
        Generate a realistic 2-3 sentence response that this person would send as a message. \
        The response should reflect their personality, concerns, and perspective. \
        Be conversational and authentic to their character. Do not use formal language unless it fits their persona.",
        persona.agent_prompt
    );

    let user_prompt = format!(
        "An event just happened in the {} zone:\\n\\nTitle: {}\\nDescription: {}\\n\\n\
        This event has a positivity score of {} (ranging from -1 to 1, where -1 is very negative and 1 is very positive) \
        and a severity of {} (0 to 1, where 1 is very severe).\\n\\n\
        Write a 2-3 sentence message responding to this event from your perspective as this person.",
        event.zone, event.title, event.description, event.positivity, event.severity
    );

    let chat_request = ChatRequest {
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ],
        max_tokens: 200,
        temperature: 0.8,
        model: "DeepSeek-V3.1".to_string(),
    };

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_request)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Chat API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Chat API request failed")
        })?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        eprintln!("Chat API error: {} - {}", status, error_text);
        return Err(actix_web::error::ErrorInternalServerError("Chat API failed"));
    }

    let chat_response: ChatResponse = response.json().await.map_err(|e| {
        eprintln!("Failed to parse chat response: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to parse chat response")
    })?;

    chat_response.choices
        .first()
        .map(|choice| choice.message.content.clone())
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No chat response returned"))
}

fn load_personas() -> Result<Vec<Persona>, Error> {
    let personas_path = std::path::Path::new("personas.json");
    let personas_content = std::fs::read_to_string(personas_path).map_err(|e| {
        eprintln!("Failed to read personas.json: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to read personas.json")
    })?;

    serde_json::from_str(&personas_content).map_err(|e| {
        eprintln!("Failed to parse personas.json: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to parse personas.json")
    })
}

pub async fn handle_messages(event: web::Json<EventRequest>) -> Result<HttpResponse, Error> {
    eprintln!("\\n=== GENERATING CONSTITUENT MESSAGES ===");
    eprintln!("Event: {} in {}", event.title, event.zone);

    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    let combined_text = format!("{} {}", event.title, event.description);
    eprintln!("Getting embedding for event...");
    let event_embedding = get_embedding(&combined_text, &api_key).await?;

    eprintln!("Loading personas...");
    let personas = load_personas()?;
    eprintln!("Loaded {} personas", personas.len());

    if !event.exclusions.is_empty() {
        eprintln!("Excluding {} personas: {:?}", event.exclusions.len(), event.exclusions);
    }

    eprintln!("Calculating cosine similarities...");
    let mut similarities: Vec<(usize, f64)> = personas
        .iter()
        .enumerate()
        .filter(|(_, persona)| !event.exclusions.contains(&persona.name))
        .map(|(idx, persona)| {
            let similarity = cosine_similarity(&event_embedding, &persona.embeddings);
            (idx, similarity)
        })
        .collect();

    similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    let top_2: Vec<&Persona> = similarities
        .iter()
        .take(2)
        .map(|(idx, _)| &personas[*idx])
        .collect();

    eprintln!("Top 2 similar personas:");
    for (i, persona) in top_2.iter().enumerate() {
        eprintln!("  {}. {} (similarity: {:.4})", i + 1, persona.name, similarities[i].1);
    }

    eprintln!("Generating responses...");
    let mut responses = Vec::new();

    for persona in top_2 {
        let message = generate_persona_response(persona, &event, &api_key).await?;
        responses.push(PersonaResponse {
            name: persona.name.clone(),
            message,
        });
        eprintln!("  ✓ Generated response for {}", persona.name);
    }

    eprintln!("=== CONSTITUENT MESSAGES COMPLETE ===\\n");

    Ok(HttpResponse::Ok().json(responses))
}
