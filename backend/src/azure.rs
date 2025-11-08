//! Azure AI Integration
//!
//! This module handles all interactions with the Azure AI service.
//! It constructs prompts, sends requests to the AI, and parses responses
//! into structured simulation data.
//!
//! ## Key Functions
//!
//! - `generate_simulation()`: Main function that orchestrates the AI simulation
//! - Azure API types: Structures for communicating with Azure's chat completion API

use crate::types::{SimulationChunk, SimulationRequest};
use crate::utils::{
    JsonArrayChunkParser, build_neighborhoods_context, complete_interdependent_metrics,
};
use actix_web::web::Bytes;
use futures_util::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::env;

/// Role of a message in the Azure AI chat completion API
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    /// System message that sets the AI's behavior and instructions
    System,
    /// User message containing the policy proposal or query
    User,
    /// Assistant message (typically in responses, not used in requests)
    Assistant,
}

/// A single message in the chat completion request
#[derive(Debug, Deserialize, Serialize)]
pub struct Message {
    /// The role of the message sender
    pub role: MessageRole,
    /// The text content of the message
    pub content: String,
}

/// Incremental content delta from a streaming response
#[derive(Debug, Deserialize)]
pub struct Delta {
    /// The text content added in this delta
    #[serde(default)]
    pub content: String,
}

/// A choice in the streaming response containing delta updates
#[derive(Debug, Deserialize)]
pub struct StreamChoice {
    /// The incremental content update
    pub delta: Delta,
}

/// Response structure for streaming chat completions from Azure AI
#[derive(Debug, Deserialize)]
pub struct StreamResponse {
    /// Array of choices, typically containing one delta update
    pub choices: Vec<StreamChoice>,
}

/// Request payload for Azure AI chat completion API
#[derive(Debug, Deserialize, Serialize)]
pub struct ChatCompletionRequest {
    /// Conversation messages (system prompt + user prompt)
    pub messages: Vec<Message>,
    /// Whether to stream the response (always true for this application)
    #[serde(skip_serializing_if = "is_false")]
    pub stream: bool,
    /// Maximum number of tokens to generate (default: 16000)
    #[serde(
        rename = "max_completion_tokens",
        skip_serializing_if = "Option::is_none"
    )]
    pub max_completion_tokens: Option<u32>,
    /// Sampling temperature (0.0 to 2.0, default: 1.0)
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    /// Nucleus sampling parameter (0.0 to 1.0, default: 1.0)
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    /// Model identifier (default: "grok-4-fast-reasoning")
    #[serde(default = "default_model")]
    pub model: String,
}

/// Helper function for serde to skip serializing false values
fn is_false(b: &bool) -> bool {
    !b
}

/// Default temperature value for chat completion requests
fn default_temperature() -> f32 {
    1.0
}

/// Default top_p value for chat completion requests
fn default_top_p() -> f32 {
    1.0
}

/// Default model identifier for chat completion requests
fn default_model() -> String {
    "grok-4-fast-reasoning".to_string()
}

/// Builds the system prompt for the Azure AI chat completion
///
/// The system prompt instructs the AI on how to generate simulation results.
/// It includes:
/// - Role definition (urban planning expert for Atlanta)
/// - Output format requirements (JSON array, no markdown)
/// - Event chunk structure specifications
/// - Interdependency rules for metrics
/// - Guidelines for realistic event generation
///
/// # Arguments
///
/// * `neighborhoods_context` - Formatted string containing all neighborhood data
///
/// # Returns
///
/// A complete system prompt string ready to send to the AI
fn build_system_prompt(neighborhoods_context: &str) -> String {
    format!(
        r#"You are an expert urban planning simulation AI for the city of Atlanta, Georgia. Your role is to analyze policy decisions and predict their realistic impacts on specific neighborhoods.

When given a policy proposal, you must:
1. Analyze which neighborhoods would most likely be affected by the policy
2. Consider the baseline descriptions, current events, and neighboring neighborhoods to understand context and connections
3. Determine what kinds of events would actually take place in each affected neighborhood
4. Assess how severe and positive/negative each event would be
5. Generate realistic simulation results that reflect real-world urban dynamics
6. Return results in the exact JSON format specified below

Neighborhood Context Data:
{}

CRITICAL OUTPUT FORMAT REQUIREMENTS:
You MUST return a valid JSON array. The response must be:
- A JSON array starting with [ and ending with ]
- Each element is a JSON object with a "type" field and a "data" field
- NO markdown code blocks (no ```json or ```)
- NO explanatory text before or after the JSON
- NO comments or additional formatting
- Valid JSON that can be parsed directly

The response must be a JSON array of simulation chunks. Each chunk must be one of these types:

1. Event chunks (each event includes a partial metrics object with ONLY the fields that change):
   {{"type": "event", "data": {{
     "id": "event-<index>",
     "zoneId": "<neighborhood-name>",
     "zoneName": "<neighborhood-name>",
     "type": "<dynamic-event-type>",
     "title": "<concise-event-title>",
     "description": "<detailed description of the event>",
     "severity": <number 0.0-1.0>,
     "positivity": <number -1.0 to 1.0>,
     "coordinates": [<latitude>, <longitude>],
     "metrics": {{
       "zoneId": "<neighborhood-name>",
       "zoneName": "<neighborhood-name>",
       (only include fields that change for this specific event)
     }} (optional, include ONLY if event affects metrics)
   }}}}

2. Complete chunk (exactly one, at the end):
   {{"type": "complete", "data": {{
     "summary": "<brief summary of the simulation results>"
   }}}}

INTERDEPENDENCY RULES:
- If you change "education_distribution", also update "derived.higher_ed_percent" = bachelors + graduate
- If you change "race_distribution", also update "diversity_index" using Shannon diversity: 1 - Σ(p²)
- If you change "population_total", also update "derived.density_index" = population_total / area_acres

Important Guidelines:
- Analyze the policy to determine which neighborhoods would be affected
- Use neighborhood names from the provided data for zoneId and zoneName
- The event "type" field should be descriptive (e.g., "transportation", "housing", "economic")
- Each event MUST include a "title" field (3-8 words)
- Make changes realistic and proportional to the policy's scope
- Consider both positive and negative impacts
- When including distribution objects, you MUST include complete objects with ALL fields
- Generate 3-8 events based on the policy (don't exceed 15)
- Return ONLY the JSON array, nothing else"#,
        neighborhoods_context
    )
}

/// Generates a simulation stream using Azure AI
///
/// This is the main function that orchestrates the AI simulation process:
/// 1. Validates the Azure API key
/// 2. Builds the system and user prompts from the request
/// 3. Sends a streaming request to Azure AI
/// 4. Parses the streaming SSE response character-by-character
/// 5. Extracts complete JSON chunks as they arrive
/// 6. Completes interdependent metrics for each event
/// 7. Streams processed chunks back to the client as SSE events
///
/// The function uses a custom JSON parser that tracks bracket depth to extract
/// complete event objects from the streaming response, allowing incremental
/// delivery of events to the frontend.
///
/// # Arguments
///
/// * `request` - The simulation request containing policy prompt and neighborhood data
///
/// # Returns
///
/// A stream of SSE-formatted bytes containing simulation chunks, or an error
/// if the API key is missing or the request fails
///
/// # Errors
///
/// Returns an `actix_web::Error` if:
/// - `AZURE_API_KEY` environment variable is not set
/// - The HTTP request to Azure AI fails
pub async fn generate_simulation(
    request: SimulationRequest,
) -> Result<impl Stream<Item = Result<Bytes, std::io::Error>>, actix_web::Error> {
    eprintln!("\n=== STARTING AI SIMULATION ===");

    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    eprintln!("✓ Azure API key found");

    let neighborhoods_context = build_neighborhoods_context(&request.neighborhood_properties);
    let system_prompt = build_system_prompt(&neighborhoods_context);

    let selected_zones_str = if request.selected_zones.is_empty() {
        "All neighborhoods may be affected (analyze which ones would realistically be impacted by this policy)".to_string()
    } else {
        format!(
            "Focus on these neighborhoods: {}",
            request.selected_zones.join(", ")
        )
    };

    let user_prompt = format!(
        "Simulate the following policy proposal:\n\nPolicy: {}\n\nSelected Zones: {}\n\n\
         Analyze which neighborhoods would be affected by this policy, considering direct impacts and spillover effects. \
         Generate realistic events that would occur in each affected neighborhood, with partial metrics updates that reflect \
         how each event changes the neighborhood's state. Return the results as a JSON array of simulation chunks.",
        request.prompt, selected_zones_str
    );

    let chat_request = ChatCompletionRequest {
        messages: vec![
            Message {
                role: MessageRole::System,
                content: system_prompt,
            },
            Message {
                role: MessageRole::User,
                content: user_prompt,
            },
        ],
        stream: true,
        max_completion_tokens: Some(16000),
        temperature: 1.0,
        top_p: 1.0,
        model: default_model(),
    };

    let url = "https://aiatlai.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview";
    let client = reqwest::Client::new();

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_request)
        .send()
        .await
        .map_err(|e| {
            eprintln!("✗ Azure API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Azure API request failed")
        })?;

    eprintln!("📥 Streaming response from Azure AI");

    let stream = response.bytes_stream();
    let neighborhood_props = request.neighborhood_properties.clone();

    let output_stream = async_stream::stream! {
        let mut json_parser = JsonArrayChunkParser::new();
        let mut sse_buffer = String::new();
        let mut chunk_count = 0;
        let mut event_count = 0;
        let mut parse_errors = 0u32;

        futures_util::pin_mut!(stream);
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    let chunk_str = String::from_utf8_lossy(&chunk);
                    chunk_count += 1;

                    sse_buffer.push_str(&chunk_str);

                    let mut lines: Vec<String> = sse_buffer.split('\n').map(|s| s.to_string()).collect();
                    let last_line = lines.pop().unwrap_or_default();
                    sse_buffer = last_line;

                    for line in lines {
                        let trimmed = line.trim();
                        if trimmed.starts_with("data: ") {
                            let data = trimmed[6..].trim();

                            if data == "[DONE]" {
                                eprintln!("✓ Received [DONE] marker");
                                break;
                            }

                            if let Ok(stream_response) = serde_json::from_str::<StreamResponse>(data) {
                                if let Some(choice) = stream_response.choices.first() {
                                    let content = &choice.delta.content;
                                    if !content.is_empty() {
                                        for ch in content.chars() {
                                            if let Some(chunk_json) = json_parser.process_char(ch) {
                                                match serde_json::from_str::<SimulationChunk>(&chunk_json) {
                                                    Ok(chunk) => {
                                                        let processed_chunk = match chunk {
                                                            SimulationChunk::Event { mut data } => {
                                                                if let Some(ref mut metrics) = data.metrics {
                                                                    if let Some(original_neighborhood) = neighborhood_props
                                                                        .iter()
                                                                        .find(|n| n.name == metrics.zone_id)
                                                                    {
                                                                        complete_interdependent_metrics(metrics, original_neighborhood);
                                                                    }
                                                                }
                                                                event_count += 1;
                                                                eprintln!("✅ Parsed and streaming event #{}", event_count);
                                                                SimulationChunk::Event { data }
                                                            }
                                                            SimulationChunk::Complete { data } => {
                                                                eprintln!("✅ Streaming completion summary");
                                                                SimulationChunk::Complete { data }
                                                            }
                                                        };

                                                        if let Ok(json) = serde_json::to_string(&processed_chunk) {
                                                            let sse_data = format!("data: {}\n\n", json);
                                                            yield Ok::<_, std::io::Error>(Bytes::from(sse_data));
                                                        }
                                                    }
                                                    Err(err) => {
                                                        parse_errors += 1;
                                                        if parse_errors <= 3 {
                                                            let preview = chunk_json.chars().take(200).collect::<String>();
                                                            eprintln!("✗ Failed to parse chunk ({} chars): {}", chunk_json.len(), err);
                                                            eprintln!("Chunk preview: {}", preview);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("✗ Stream error: {}", e);
                    break;
                }
            }
        }

        eprintln!("📊 Received {} SSE chunks total", chunk_count);
        eprintln!("✓ Streamed {} events incrementally", event_count);
        eprintln!("=== END AI SIMULATION ===\n");
    };

    Ok(output_stream)
}
