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
    JsonArrayChunkParser, build_minimal_context, build_neighborhoods_context,
    complete_interdependent_metrics, lookup_neighborhoods_by_names,
};
use actix_web::web::Bytes;
use async_stream::stream;
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

/// Token usage information from Azure AI API
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct Usage {
    #[serde(rename = "prompt_tokens")]
    pub prompt_tokens: Option<u32>,
    #[serde(rename = "completion_tokens")]
    pub completion_tokens: Option<u32>,
    #[serde(rename = "total_tokens")]
    pub total_tokens: Option<u32>,
}

/// Response structure for streaming chat completions from Azure AI
#[derive(Debug, Deserialize)]
pub struct StreamResponse {
    /// Array of choices, typically containing one delta update
    pub choices: Vec<StreamChoice>,
    /// Token usage information (may be present in final chunks)
    #[serde(default)]
    pub usage: Option<Usage>,
}

/// Request payload for Azure AI Responses API
#[derive(Debug, Deserialize, Serialize)]
pub struct ChatCompletionRequest {
    /// Conversation messages (system prompt + user prompt)
    pub messages: Vec<Message>,
    /// Whether to stream the response (always true for this application)
    #[serde(skip_serializing_if = "is_false")]
    pub stream: bool,
    /// Maximum number of tokens to generate (default: 2048)
    #[serde(rename = "max_tokens", skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    /// Sampling temperature (0.0 to 2.0, default: 0.8)
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    /// Nucleus sampling parameter (0.0 to 1.0, default: 0.1)
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    /// Presence penalty (default: 0.0)
    #[serde(default = "default_presence_penalty")]
    pub presence_penalty: f32,
    /// Frequency penalty (default: 0.0)
    #[serde(default = "default_frequency_penalty")]
    pub frequency_penalty: f32,
    /// Model identifier (default: "DeepSeek-V3.1")
    #[serde(default = "default_model")]
    pub model: String,
}

/// Helper function for serde to skip serializing false values
fn is_false(b: &bool) -> bool {
    !b
}

/// Default temperature value for chat completion requests
fn default_temperature() -> f32 {
    0.8
}

/// Default top_p value for chat completion requests
fn default_top_p() -> f32 {
    0.1
}

/// Default presence penalty value for chat completion requests
fn default_presence_penalty() -> f32 {
    0.0
}

/// Default frequency penalty value for chat completion requests
fn default_frequency_penalty() -> f32 {
    0.0
}

/// Default model identifier for chat completion requests
fn default_model() -> String {
    "DeepSeek-V3.1".to_string()
}

/// Builds the Phase 1 system prompt for identifying target neighborhoods
///
/// This prompt is used in Phase 1 to identify which neighborhoods should have
/// events generated, using only minimal context (names + contextual fields).
///
/// # Arguments
///
/// * `minimal_context` - Formatted string containing minimal neighborhood context
///
/// # Returns
///
/// A complete system prompt string for Phase 1
fn build_phase1_system_prompt(minimal_context: &str) -> String {
    format!(
        r#"You are an expert urban planning analyst for the city of Atlanta, Georgia. Your role is to analyze policy proposals and identify which neighborhoods would be impacted.

When given a policy proposal, you must:
1. Analyze the policy to determine its scope and potential impacts
2. Consider the baseline descriptions, current events, and neighboring neighborhoods to understand context and connections
3. Identify neighborhoods that would be directly or indirectly affected by this policy
4. Include neighborhoods that would experience spillover effects or secondary impacts
5. Select neighborhoods based on realistic policy impact analysis - prioritize the most impacted neighborhoods
6. Return NO MORE THAN 10 neighborhoods - this is a hard limit

Neighborhood Context Data:
{}

CRITICAL OUTPUT FORMAT REQUIREMENTS:
You MUST return a valid JSON array of neighborhood names. The response must be:
- A JSON array starting with [ and ending with ]
- Each element is a string containing the exact neighborhood name
- NO markdown code blocks (no ```json or ```)
- NO explanatory text before or after the JSON
- NO comments or additional formatting
- Valid JSON that can be parsed directly
- MAXIMUM 10 neighborhoods - this is a hard limit

Example output format:
["Downtown", "Midtown", "Buckhead"]

CRITICAL: Return NO MORE THAN 10 neighborhood names. If more than 10 neighborhoods would be affected, select the 10 most directly impacted neighborhoods.

Return ONLY the JSON array of neighborhood names, nothing else."#,
        minimal_context
    )
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
        r#"You are an expert urban planning simulation AI for the city of Atlanta, Georgia. Your role is to generate realistic events that would occur as a result of a policy implementation in specific neighborhoods.

ROLE: Generate realistic events that would occur from policy implementation in specific neighborhoods.

GROUNDING DATA:
{}

OUTPUT FORMAT (CRITICAL):
You MUST return a valid JSON array. Requirements:
- Start with [ and end with ]
- Each element: {{"type": "...", "data": {{...}}}}
- NO markdown code blocks (no ```json or ```)
- NO text before or after JSON
- Valid, parseable JSON only

EXAMPLE OUTPUT:
[
  {{"type": "event", "data": {{
    "id": "event-1",
    "zoneId": "Downtown",
    "zoneName": "Downtown",
    "type": "infrastructure",
    "title": "Water Service Disruption Begins",
    "description": "Extended water shutdown forces temporary relocation of 500 residents. Emergency water distribution centers established.",
    "severity": 0.8,
    "positivity": -0.7,
    "coordinates": [33.755, -84.389],
    "metrics": {{
      "zoneId": "Downtown",
      "zoneName": "Downtown",
      "population_total": 4800,
      "derived": {{"higher_ed_percent": 45.2, "density_index": 12.5}}
    }}
  }}}},
  {{"type": "event", "data": {{
    "id": "event-2",
    "zoneId": "Midtown",
    "zoneName": "Midtown",
    "type": "economic",
    "title": "Business Closures Due to Water Crisis",
    "description": "Restaurants and cafes forced to close, affecting 200 jobs.",
    "severity": 0.6,
    "positivity": -0.5,
    "coordinates": [33.784, -84.384],
    "metrics": {{
      "zoneId": "Midtown",
      "zoneName": "Midtown",
      "median_income": 52000
    }}
  }}}},
  {{"type": "complete", "data": {{
    "summary": "Water shutdown resulted in temporary population displacement, business closures, and increased emergency service coordination across affected neighborhoods."
  }}}}
]

CHUNK TYPES:

1. Event chunks (include partial metrics with ONLY fields that change):
   {{"type": "event", "data": {{
     "id": "event-<index>",
     "zoneId": "<neighborhood-name>",
     "zoneName": "<neighborhood-name>",
     "type": "<dynamic-event-type>",
     "title": "<concise-event-title>",
     "description": "<detailed description>",
     "severity": <0.0-1.0>,
     "positivity": <-1.0 to 1.0>,
     "coordinates": [<latitude>, <longitude>],
     "metrics": {{
       "zoneId": "<neighborhood-name>",
       "zoneName": "<neighborhood-name>",
       (only include fields that change for this event)
     }} (optional, include ONLY if event affects metrics)
   }}}}

2. Complete chunk (exactly one, at the end):
   {{"type": "complete", "data": {{
     "summary": "<brief summary of simulation results>"
   }}}}

INTERDEPENDENCY RULES (MANDATORY):
- Changing "education_distribution" → update "derived.higher_ed_percent" = bachelors + graduate
- Changing "race_distribution" → update "diversity_index" using Shannon diversity: 1 - Σ(p²)
- Changing "population_total" → update "derived.density_index" = population_total / area_acres
- CRITICAL: If you include a "derived" object, it MUST have BOTH "higher_ed_percent" AND "density_index" (never partial)

GUIDELINES:
- Generate 3-15 events total (hard requirement: minimum 3, maximum 15)
- Use exact neighborhood names from provided data for zoneId and zoneName
- Event "type": descriptive category (e.g., "transportation", "housing", "economic", "infrastructure")
- Event "title": 3-8 words, concise and specific
- Metrics: Think of metrics like a patch - only include fields that change, not the entire neighborhood state
- Distribution objects: When included, provide ALL fields (complete objects only)
- Make changes realistic and proportional to the policy's scope
- Consider both positive and negative impacts
- Each event is like a news headline: specific, impactful, and tied to a location

FALLBACK:
If you cannot generate valid events for any reason, return a complete chunk with an error summary:
{{"type": "complete", "data": {{"summary": "Unable to generate events: [reason]"}}}}

FINAL REMINDERS:
- Return ONLY the JSON array, nothing else
- If including "derived" object, BOTH "higher_ed_percent" AND "density_index" are required
- NO markdown, NO explanations, NO text outside the JSON array"#,
        neighborhoods_context
    )
}

/// Identifies target neighborhoods for Phase 1
///
/// Calls the LLM with minimal context to identify which neighborhoods
/// should have events generated. Returns a list of neighborhood names.
///
/// # Arguments
///
/// * `prompt` - The policy proposal text
/// * `selected_zones` - Optional list of selected zones
/// * `minimal_context` - Minimal neighborhood context string
/// * `api_key` - Azure API key
///
/// # Returns
///
/// A vector of neighborhood names that should have events generated
async fn identify_target_neighborhoods(
    prompt: &str,
    selected_zones: &[String],
    minimal_context: &str,
    api_key: &str,
) -> Result<Vec<String>, actix_web::Error> {
    eprintln!("   → Sending minimal context to LLM (reduced token usage)");

    let system_prompt = build_phase1_system_prompt(minimal_context);

    let selected_zones_str = if selected_zones.is_empty() {
        "All neighborhoods may be affected (analyze which ones would realistically be impacted by this policy)".to_string()
    } else {
        format!(
            "Focus on these neighborhoods: {}",
            selected_zones.join(", ")
        )
    };

    let user_prompt = format!(
        "Policy Proposal: {}\n\nSelected Zones: {}\n\n\
         Identify all neighborhoods that would be directly or indirectly affected by this policy. \
         Include neighborhoods that would experience spillover effects or secondary impacts. \
         Return a JSON array of neighborhood names.",
        prompt, selected_zones_str
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
        stream: false,
        max_tokens: Some(2048),
        temperature: 0.7,
        top_p: 0.1,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
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
            eprintln!("✗ Phase 1 API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Phase 1 API request failed")
        })?;

    let status = response.status();
    eprintln!("   📡 Phase 1 HTTP Status: {}", status);

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Could not read error response".to_string());
        eprintln!("✗ Phase 1 API returned error status: {}", status);
        eprintln!("   Error response: {}", error_text);
        return Err(actix_web::error::ErrorInternalServerError(format!(
            "Phase 1 API returned error status: {}",
            status
        )));
    }

    let response_json: serde_json::Value = response.json().await.map_err(|e| {
        eprintln!("✗ Failed to parse Phase 1 response: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to parse Phase 1 response")
    })?;

    eprintln!("   🔍 Phase 1 Response Structure:");
    eprintln!(
        "      Response keys: {:?}",
        response_json
            .as_object()
            .map(|o| o.keys().collect::<Vec<_>>())
    );

    if let Some(error) = response_json.get("error") {
        eprintln!(
            "   ✗ Azure API Error: {}",
            serde_json::to_string_pretty(error).unwrap_or_default()
        );
        return Err(actix_web::error::ErrorInternalServerError(
            "Azure API returned an error",
        ));
    }

    if let Some(usage) = response_json.get("usage") {
        let prompt_tokens = usage.get("prompt_tokens").and_then(|v| v.as_u64());
        let completion_tokens = usage.get("completion_tokens").and_then(|v| v.as_u64());
        let total_tokens = usage.get("total_tokens").and_then(|v| v.as_u64());

        eprintln!("   📊 Phase 1 Token Usage:");
        if let Some(pt) = prompt_tokens {
            eprintln!("      Prompt tokens: {}", pt);
        }
        if let Some(ct) = completion_tokens {
            eprintln!("      Completion tokens: {}", ct);
        }
        if let Some(tt) = total_tokens {
            eprintln!("      Total tokens: {}", tt);
        }
    } else {
        eprintln!("   ⚠️  Token usage information not available in Phase 1 response");
    }

    let choices = response_json
        .get("choices")
        .and_then(|c| c.as_array())
        .ok_or_else(|| {
            eprintln!("✗ No 'choices' array in Phase 1 response");
            eprintln!(
                "   Full response: {}",
                serde_json::to_string_pretty(&response_json).unwrap_or_default()
            );
            actix_web::error::ErrorInternalServerError("No choices array in Phase 1 response")
        })?;

    if choices.is_empty() {
        eprintln!("✗ 'choices' array is empty in Phase 1 response");
        eprintln!(
            "   Full response: {}",
            serde_json::to_string_pretty(&response_json).unwrap_or_default()
        );
        return Err(actix_web::error::ErrorInternalServerError(
            "Choices array is empty in Phase 1 response",
        ));
    }

    if let Some(finish_reason) = choices[0].get("finish_reason").and_then(|r| r.as_str()) {
        if finish_reason == "length" {
            eprintln!("⚠️  Phase 1 response was truncated due to token limit");
            eprintln!(
                "   Consider increasing max_tokens or reducing the number of neighborhoods in context"
            );
        }
    }

    let content = choices[0]
        .get("message")
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| {
            eprintln!("✗ No content in Phase 1 response");
            eprintln!(
                "   Choices structure: {}",
                serde_json::to_string_pretty(&choices[0]).unwrap_or_default()
            );
            eprintln!(
                "   Full response: {}",
                serde_json::to_string_pretty(&response_json).unwrap_or_default()
            );
            actix_web::error::ErrorInternalServerError("No content in Phase 1 response")
        })?;

    eprintln!(
        "   📝 Response content length: {} characters",
        content.len()
    );

    let cleaned_content = content.trim();
    let cleaned_content = if cleaned_content.starts_with("```json") {
        &cleaned_content[7..]
    } else if cleaned_content.starts_with("```") {
        &cleaned_content[3..]
    } else {
        cleaned_content
    };
    let cleaned_content = cleaned_content.trim_end_matches("```").trim();

    if !cleaned_content.trim().starts_with('[') || !cleaned_content.trim().ends_with(']') {
        eprintln!("⚠️  Response may be incomplete or malformed");
        eprintln!(
            "   First 200 chars: {}",
            cleaned_content.chars().take(200).collect::<String>()
        );
        eprintln!(
            "   Last 200 chars: {}",
            cleaned_content
                .chars()
                .rev()
                .take(200)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()
        );
    }

    let neighborhoods: Vec<String> = serde_json::from_str(cleaned_content).map_err(|e| {
        eprintln!("✗ Failed to parse neighborhood names: {}", e);
        eprintln!(
            "   Response content length: {} characters",
            cleaned_content.len()
        );
        eprintln!(
            "   First 500 chars: {}",
            cleaned_content.chars().take(500).collect::<String>()
        );
        eprintln!(
            "   Last 500 chars: {}",
            cleaned_content
                .chars()
                .rev()
                .take(500)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()
        );
        actix_web::error::ErrorInternalServerError("Failed to parse neighborhood names")
    })?;

    if neighborhoods.len() > 15 {
        eprintln!(
            "⚠️  Warning: LLM returned {} neighborhoods (expected 3-8)",
            neighborhoods.len()
        );
        eprintln!("   This may indicate the prompt needs to be more strict");
    }

    eprintln!(
        "   ✓ Phase 1 Complete: Identified {} target neighborhoods",
        neighborhoods.len()
    );
    eprintln!("   Target neighborhoods: {:?}", neighborhoods);

    Ok(neighborhoods)
}

/// Generates events with full context for Phase 2
///
/// Takes the identified target neighborhoods, looks up their full properties,
/// and generates events using the complete neighborhood data.
///
/// # Arguments
///
/// * `prompt` - The policy proposal text
/// * `target_neighborhoods` - List of neighborhood names to generate events for
/// * `neighborhood_lookup` - HashMap of full neighborhood properties keyed by name
/// * `api_key` - Azure API key
///
/// # Returns
///
/// A stream of SSE-formatted bytes containing simulation chunks
async fn generate_events_with_full_context(
    prompt: String,
    target_neighborhoods: Vec<String>,
    neighborhood_lookup: std::collections::HashMap<String, crate::types::NeighborhoodProperties>,
    api_key: String,
) -> Result<impl Stream<Item = Result<Bytes, std::io::Error>>, actix_web::Error> {
    eprintln!(
        "   → Looking up full properties for {} target neighborhoods",
        target_neighborhoods.len()
    );

    let full_properties: Vec<_> = target_neighborhoods
        .iter()
        .filter_map(|name| neighborhood_lookup.get(name))
        .cloned()
        .collect();

    if full_properties.is_empty() {
        return Err(actix_web::error::ErrorInternalServerError(
            "No full properties found for target neighborhoods",
        ));
    }

    eprintln!(
        "   ✓ Loaded full properties for {} neighborhoods",
        full_properties.len()
    );
    eprintln!("   → Formatting full context for LLM (demographics, economics, housing data)");

    let neighborhoods_context = build_neighborhoods_context(&full_properties);
    let context_length = neighborhoods_context.len();
    eprintln!(
        "   📝 Formatted context length: {} characters (~{} tokens estimated)",
        context_length,
        context_length / 4
    );

    let system_prompt = build_system_prompt(&neighborhoods_context);
    eprintln!("   → Sending full context to LLM for event generation");

    let target_neighborhoods_str = target_neighborhoods.join(", ");
    let user_prompt = format!(
        "Policy Proposal: {}\n\nTarget Neighborhoods: {}\n\n\
         Generate realistic events that would occur in each of these neighborhoods as a result of this policy. \
         Include partial metrics updates that reflect how each event changes the neighborhood's state. \
         Create as many events as needed to accurately represent the policy's impact on each neighborhood.\n\n\
         CRITICAL: Return ONLY a valid JSON array in the exact format specified. Do not include markdown code blocks, \
         explanations, or any text outside the JSON array.",
        prompt, target_neighborhoods_str
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
        max_tokens: Some(2048),
        temperature: 0.8,
        top_p: 0.1,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        model: default_model(),
    };

    let url = "https://aiatlai.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview";
    let client = reqwest::Client::new();

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", &api_key))
        .json(&chat_request)
        .send()
        .await
        .map_err(|e| {
            eprintln!("✗ Phase 2 API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Phase 2 API request failed")
        })?;

    eprintln!("   📥 Streaming events from Azure AI...");

    let stream = response.bytes_stream();

    let output_stream = async_stream::stream! {
        let mut json_parser = JsonArrayChunkParser::new();
        let mut sse_buffer = String::new();
        let mut chunk_count = 0;
        let mut event_count = 0;
        let mut parse_errors = 0u32;
        let mut phase2_usage: Option<Usage> = None;
        let mut received_complete_chunk = false;

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
                                if let Some(usage) = stream_response.usage {
                                    phase2_usage = Some(usage);
                                }

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
                                                                    if let Some(original_neighborhood) = full_properties
                                                                        .iter()
                                                                        .find(|n| n.name == metrics.zone_id)
                                                                    {
                                                                        complete_interdependent_metrics(metrics, original_neighborhood);
                                                                    }
                                                                }
                                                                event_count += 1;
                                                                eprintln!("✅ Parsed and streaming event #{}", event_count);
                                                                Some(SimulationChunk::Event { data })
                                                            }
                                                            SimulationChunk::Update { .. } => {
                                                                eprintln!("⚠️  Received update chunk from LLM (unexpected, skipping)");
                                                                None
                                                            }
                                                            SimulationChunk::Complete { data } => {
                                                                received_complete_chunk = true;
                                                                eprintln!("✅ Streaming completion summary");
                                                                Some(SimulationChunk::Complete { data })
                                                            }
                                                        };

                                                        if let Some(processed_chunk) = processed_chunk {
                                                            if let Ok(json) = serde_json::to_string(&processed_chunk) {
                                                                let sse_data = format!("data: {}\n\n", json);
                                                                yield Ok::<_, std::io::Error>(Bytes::from(sse_data));
                                                            }
                                                        }
                                                    }
                                                    Err(err) => {
                                                        parse_errors += 1;
                                                        let preview = chunk_json.chars().take(200).collect::<String>();
                                                        eprintln!("⚠️  Failed to parse chunk #{} ({} chars): {}", parse_errors, chunk_json.len(), err);
                                                        eprintln!("   Chunk preview: {}", preview);
                                                        eprintln!("   Skipping malformed chunk and continuing...");
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

        eprintln!("   ✓ Phase 2 Complete:");
        eprintln!("      - Received {} SSE chunks", chunk_count);
        eprintln!("      - Generated {} events", event_count);
        eprintln!("      - Parse errors: {}", parse_errors);

        if !received_complete_chunk {
            eprintln!("   ⚠️  No complete chunk received from AI, sending fallback completion");
            let fallback_complete = SimulationChunk::Complete {
                data: crate::types::SimulationComplete {
                    summary: format!(
                        "Simulation completed with {} events generated. {} events were skipped due to parsing errors.",
                        event_count,
                        parse_errors
                    ),
                },
            };
            if let Ok(json) = serde_json::to_string(&fallback_complete) {
                let sse_data = format!("data: {}\n\n", json);
                yield Ok::<_, std::io::Error>(Bytes::from(sse_data));
            }
        }

        if let Some(usage) = phase2_usage {
            eprintln!("      📊 Phase 2 Token Usage:");
            if let Some(pt) = usage.prompt_tokens {
                eprintln!("         Prompt tokens: {}", pt);
            }
            if let Some(ct) = usage.completion_tokens {
                eprintln!("         Completion tokens: {}", ct);
            }
            if let Some(tt) = usage.total_tokens {
                eprintln!("         Total tokens: {}", tt);
            }
        } else {
            eprintln!("      ⚠️  Token usage information not available in Phase 2");
        }

        eprintln!("\n=== SIMULATION COMPLETE ===\n");
    };

    Ok(output_stream)
}

/// Generates a simulation stream using Azure AI with two-phase approach
///
/// ## Two-Phase Flow:
///
/// **Phase 1: Identify Target Neighborhoods**
/// - Input: Minimal context (name + baseline_description + current_events + neighboring_neighborhoods) for ALL neighborhoods
/// - Process: LLM analyzes policy and identifies 3-8 neighborhoods that should have events
/// - Output: List of target neighborhood names
/// - Token Usage: Low (~1,000-5,000 tokens) because we only send minimal context
///
/// **Phase 2: Generate Events with Full Context**
/// - Input: Full properties (all demographic, economic, housing data) ONLY for target neighborhoods from Phase 1
/// - Process: LLM generates detailed events and metrics for the identified neighborhoods
/// - Output: Stream of simulation events
/// - Token Usage: Moderate (~1,500-8,000 tokens) because we only send full data for 3-8 neighborhoods
///
/// This approach reduces token usage by 85-95% compared to sending all full properties upfront.
///
/// # Arguments
///
/// * `request` - The simulation request containing policy prompt, minimal context, and full properties
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
/// - Phase 1 or Phase 2 API requests fail
pub async fn generate_simulation(
    request: SimulationRequest,
) -> Result<impl Stream<Item = Result<Bytes, std::io::Error>>, actix_web::Error> {
    eprintln!("\n=== STARTING TWO-PHASE AI SIMULATION ===");
    eprintln!("📋 Request Summary:");
    eprintln!("   Policy Prompt: {}", request.prompt);
    eprintln!(
        "   Selected Zones: {} ({} specified)",
        if request.selected_zones.is_empty() {
            "All neighborhoods"
        } else {
            "Specific zones"
        },
        request.selected_zones.len()
    );
    eprintln!(
        "   Neighborhood Context Loaded: {} (minimal data for Phase 1)",
        request.neighborhood_context.len()
    );
    eprintln!(
        "   Full Properties Available: {} (for Phase 2 lookup)",
        request.neighborhood_properties.len()
    );

    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    eprintln!("✓ Azure API key found");

    let minimal_context_str = build_minimal_context(&request.neighborhood_context);
    let prompt = request.prompt.clone();
    let all_neighborhood_properties = request.neighborhood_properties;

    eprintln!("\n🔄 PHASE 1: Identifying Target Neighborhoods");
    eprintln!(
        "   Input: {} neighborhoods with minimal context (name + contextual fields)",
        request.neighborhood_context.len()
    );
    eprintln!("   Goal: LLM identifies 3-8 neighborhoods that should have events generated");

    let target_neighborhoods = identify_target_neighborhoods(
        &prompt,
        &request.selected_zones,
        &minimal_context_str,
        &api_key,
    )
    .await?;

    if target_neighborhoods.is_empty() {
        return Err(actix_web::error::ErrorInternalServerError(
            "No target neighborhoods identified in Phase 1",
        ));
    }

    eprintln!("\n🔄 PHASE 2: Generating Events with Full Context");
    eprintln!(
        "   Target Neighborhoods: {} (from Phase 1)",
        target_neighborhoods.len()
    );
    eprintln!(
        "   Looking up full properties for: {:?}",
        target_neighborhoods
    );

    let neighborhood_lookup = lookup_neighborhoods_by_names(&all_neighborhood_properties);

    let found_count = target_neighborhoods
        .iter()
        .filter(|name| neighborhood_lookup.contains_key(*name))
        .count();
    eprintln!(
        "   Found full properties for: {} of {} target neighborhoods",
        found_count,
        target_neighborhoods.len()
    );

    let expected_event_count = target_neighborhoods.len() as u32;
    let update_chunk = SimulationChunk::Update {
        data: crate::types::SimulationUpdate {
            total: expected_event_count,
        },
    };

    let update_bytes = if let Ok(json) = serde_json::to_string(&update_chunk) {
        let sse_data = format!("data: {}\n\n", json);
        eprintln!(
            "   📤 Sending update chunk: expecting ~{} events for {} neighborhoods",
            expected_event_count,
            target_neighborhoods.len()
        );
        Ok(Bytes::from(sse_data))
    } else {
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to serialize update chunk",
        ))
    };

    let phase2_stream = generate_events_with_full_context(
        prompt,
        target_neighborhoods,
        neighborhood_lookup,
        api_key,
    )
    .await?;

    Ok(stream! {
        yield update_bytes;
        futures_util::pin_mut!(phase2_stream);
        while let Some(item) = phase2_stream.next().await {
            yield item;
        }
    })
}
