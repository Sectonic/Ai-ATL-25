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

use crate::neighborhoods::NeighborhoodDatabase;
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

/// Response format for structured JSON output
#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseFormat {
    #[serde(rename = "type")]
    pub format_type: String,
}

/// Structured response from Phase 1 containing neighborhood names
#[derive(Debug, Deserialize)]
pub struct Phase1Response {
    pub neighborhoods: Vec<String>,
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
    /// Response format for structured outputs (JSON mode)
    #[serde(rename = "response_format", skip_serializing_if = "Option::is_none")]
    pub response_format: Option<ResponseFormat>,
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
6. Return a DYNAMIC number of neighborhoods (3-18 range) based on the number of selected zones and policy scope:
   * Few selected zones (1-3): Return 3-6 neighborhoods
   * Moderate selected zones (4-8): Return 6-12 neighborhoods
   * Many selected zones (9+): Return 12-18 neighborhoods
   * The number should reflect both the selected zones count and actual impact scope - don't pad with unnecessary neighborhoods

Neighborhood Context Data:
{}

CRITICAL OUTPUT FORMAT REQUIREMENTS:
You MUST return a valid JSON object with a "neighborhoods" array. The response must be:
- A JSON object with a "neighborhoods" field containing an array of strings
- Each string is the exact neighborhood name
- NO markdown code blocks (no ```json or ```)
- NO explanatory text before or after the JSON
- NO comments or additional formatting
- Valid JSON that can be parsed directly
- Return 3-18 neighborhoods based on selected zones count and policy scope (not always the maximum)

Example output formats:
Few zones (1-3 selected): {{"neighborhoods": ["Downtown", "Midtown", "Buckhead"]}}
Moderate zones (4-8 selected): {{"neighborhoods": ["Downtown", "Midtown", "Buckhead", "West End", "Grant Park", "Cabbagetown", "Old Fourth Ward", "Inman Park"]}}
Many zones (9+ selected): {{"neighborhoods": ["Downtown", "Midtown", "Buckhead", "West End", "Grant Park", "Cabbagetown", "Old Fourth Ward", "Inman Park", "Virginia-Highland", "Poncey-Highland", "Little Five Points", "East Atlanta", "Reynoldstown", "Edgewood", "Kirkwood", "Ormewood Park", "East Lake", "Candler Park"]}}

CRITICAL: Return a DYNAMIC number of neighborhoods (3-18) that accurately reflects both the number of selected zones and the policy's actual impact scope. Base your count on the selected zones - if few zones are selected, return fewer neighborhoods; if many zones are selected, return more neighborhoods.

Return ONLY the JSON object with the neighborhoods array, nothing else."#,
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

1. Event chunks (REQUIRED: include metrics with ALL fields that change):
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
       (REQUIRED: include at least ONE concrete metric - population_total, median_income, housing_units, etc. - NOT just abstract indices)
       (include ALL fields that change for this event - estimate and guess when appropriate)
     }} (MANDATORY: every event must affect at least one concrete metric)
   }}}}

2. Complete chunk (exactly one, at the end):
   {{"type": "complete", "data": {{
     "summary": "<brief summary of events and results>"
   }}}}

INTERDEPENDENCY RULES (MANDATORY):
- Changing "education_distribution" → update "derived.higher_ed_percent" = bachelors + graduate
- Changing "race_distribution" → update "diversity_index" using Shannon diversity: 1 - Σ(p²)
- Changing "population_total" → update "derived.density_index" = population_total / area_acres
- CRITICAL: If you include a "derived" object, it MUST have BOTH "higher_ed_percent" AND "density_index" (never partial)

MANDATORY METRICS RULE:
- EVERY event MUST include a "metrics" object with at least ONE concrete metric that changes
- The metric MUST be a concrete, measurable value - NOT abstract indices like "livability_index" or "affordability_index" alone
- Valid concrete metrics include: population_total, median_income, median_home_value, housing_units, vacant_units, vacancy_rate, owner_occupancy, households, median_age, population_density, housing_density, education_distribution, race_distribution, commute.avg_minutes, etc.
- Abstract indices (livability_index, affordability_index, diversity_index) can be included BUT only alongside concrete metrics - never as the only metric
- If an event doesn't affect any concrete metrics, it's not a valid event - every event must change something measurable

GUIDELINES:
- Event count: Generate a DYNAMIC number of events (3-13 range) based on policy complexity and scope:
  * Simple, focused policies (e.g., single infrastructure change): 3-6 events
  * Moderate policies (e.g., multi-neighborhood program): 5-10 events
  * Complex, wide-ranging policies (e.g., city-wide initiative): 8-13 events
  * The number should reflect the actual impact scope - don't pad with unnecessary events
- Use exact neighborhood names from provided data for zoneId and zoneName
- Event "type": descriptive category (e.g., "transportation", "housing", "economic", "infrastructure")
- Event "title": 3-8 words, concise and specific
- Metrics: DO NOT limit yourself - include ALL metrics that the event would realistically affect. It is GOOD to estimate and guess based on the event's nature. Think comprehensively about cascading effects:
  * Direct impacts: What metrics does this event directly change?
  * Indirect impacts: What secondary effects would this event cause?
  * Ripple effects: What other metrics might be affected downstream?
  * Examples: If an event affects housing, consider population, income, education, diversity, affordability, vacancy rates, etc.
  * If an event affects transportation, consider commute times, population density, economic activity, etc.
  * Estimate values when you don't have exact data - reasonable estimates are better than omitting metrics
  * Include multiple related metrics that make sense together - don't be conservative
  * REMEMBER: At minimum, include at least one concrete metric (not just abstract indices)
- Distribution objects: When included, provide ALL fields (complete objects only)
- Make changes realistic and proportional to the policy's scope
- Consider both positive and negative impacts
- Each event is like a news headline: specific, impactful, and tied to a location
- Quality over quantity: Generate only meaningful events that represent real impacts

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

    let selected_zones_count = selected_zones.len();
    let range_guidance = if selected_zones_count <= 3 {
        "3-6 neighborhoods (few zones selected)"
    } else if selected_zones_count <= 8 {
        "6-12 neighborhoods (moderate zones selected)"
    } else {
        "12-18 neighborhoods (many zones selected)"
    };

    let user_prompt = format!(
        "Policy Proposal: {}\n\nSelected Zones: {} ({} zones)\n\n\
         Analyze the policy scope and the number of selected zones, then identify a DYNAMIC number of neighborhoods (3-18 range) \
         that would be directly or indirectly affected. Based on {} selected zones, return approximately {}. \
         Include neighborhoods that would experience spillover effects or secondary impacts. \
         Return a JSON object with a \"neighborhoods\" array containing the neighborhood names. \
         The count should reflect both the selected zones count and the policy's actual impact scope.",
        prompt, selected_zones_str, selected_zones_count, selected_zones_count, range_guidance
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
        response_format: Some(ResponseFormat {
            format_type: "json_object".to_string(),
        }),
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

    let phase1_response: Phase1Response = serde_json::from_str(cleaned_content).map_err(|e| {
        eprintln!("✗ Failed to parse Phase 1 structured response: {}", e);
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
        actix_web::error::ErrorInternalServerError("Failed to parse Phase 1 structured response")
    })?;

    let neighborhoods = phase1_response.neighborhoods;
    eprintln!(
        "   ✅ Successfully parsed {} neighborhoods from structured response",
        neighborhoods.len()
    );
    eprintln!("   📋 Neighborhoods: {:?}", neighborhoods);

    if neighborhoods.len() > 18 {
        eprintln!(
            "   ⚠️  Warning: {} neighborhoods returned (expected 3-18)",
            neighborhoods.len()
        );
    }

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
        "   ✓ Using {} neighborhoods for event generation",
        full_properties.len()
    );
    eprintln!("   → Generating events...");

    let neighborhoods_context = build_neighborhoods_context(&full_properties);
    let system_prompt = build_system_prompt(&neighborhoods_context);

    let target_neighborhoods_str = target_neighborhoods.join(", ");
    let user_prompt = format!(
        "Policy Proposal: {}\n\nTarget Neighborhoods: {}\n\n\
         Analyze the policy scope and complexity, then generate a DYNAMIC number of realistic events (3-13 total) \
         that matches the true impact radius. Simple policies: 3-6 events. Multi-neighborhood programs: 5-10 events. \
         Large or transformational policies: 8-13 events. Never emit filler events.\n\n\
         METRICS REQUIREMENTS (MANDATORY):\n\
         1. Every event MUST include a partial \"metrics\" object referencing ONLY the fields that change in that zone.\n\
         2. Always read the provided neighborhood baselines and output the UPDATED absolute values (not deltas).\n\
         3. Each event must change at least one concrete metric in a meaningful way:\n\
            • Populations / households / housing units: adjust by ≥0.5% of the baseline (minimum 25 units) unless the narrative justifies more.\n\
            • Rates / percentages (vacancy_rate, owner_occupancy, distributions, commute shares): adjust by ≥1 percentage point and stay within 0-100.\n\
            • Currency metrics (median_income, median_home_value): adjust by ≥2% of the baseline or ≥$500, whichever is greater.\n\
            • Commute minutes and similar scalars: adjust by ≥0.5 minutes.\n\
         4. If a policy would cause no measurable change in a neighborhood, do NOT generate an event for that neighborhood.\n\
         5. When a metric changes, include related metrics that logically move with it (population ↔ households ↔ density, housing ↔ vacancy ↔ affordability, etc.). Consider direct, indirect, and ripple effects.\n\
         6. Keep changes realistic: avoid microscopic tweaks and avoid impossible swings (>50% change) unless you explicitly describe a crisis-level shift.\n\
         7. Distribution objects (race_distribution, education_distribution) must include every key and normalize to 100. When they change, also update dependent derived values (diversity_index, derived.higher_ed_percent).\n\
         8. If you output a derived object, it MUST include BOTH higher_ed_percent and density_index computed from the new values.\n\
         9. Abstract indices (livability_index, affordability_index, diversity_index) may appear ONLY in addition to concrete metrics.\n\n\
         COHESION:\n\
         - Metrics must align with the event narrative/severity.\n\
         - Cascading effects are encouraged—estimate secondary impacts rather than leaving them untouched.\n\
         - Never copy the baseline numbers; adjust them intentionally per the thresholds above.\n\n\
         CRITICAL OUTPUT RULE:\n\
         Return ONLY the valid JSON array described in the system prompt. No markdown, comments, or prose outside the array.",
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
        response_format: None,
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

    let stream = response.bytes_stream();

    let output_stream = async_stream::stream! {
        let mut json_parser = JsonArrayChunkParser::new();
        let mut sse_buffer = String::new();
        let mut event_count = 0;
        let mut parse_errors = 0u32;
        let mut phase2_usage: Option<Usage> = None;
        let mut received_complete_chunk = false;
        let mut total_content_received = String::new();
        let mut chunks_found_by_parser = 0u32;

        futures_util::pin_mut!(stream);
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    let chunk_str = String::from_utf8_lossy(&chunk);
                    sse_buffer.push_str(&chunk_str);

                    let mut lines: Vec<String> = sse_buffer.split('\n').map(|s| s.to_string()).collect();
                    let last_line = lines.pop().unwrap_or_default();
                    sse_buffer = last_line;

                    for line in lines {
                        let trimmed = line.trim();
                        if trimmed.starts_with("data: ") {
                            let data = trimmed[6..].trim();

                            if data == "[DONE]" {
                                break;
                            }

                            if let Ok(stream_response) = serde_json::from_str::<StreamResponse>(data) {
                                if let Some(usage) = stream_response.usage {
                                    phase2_usage = Some(usage);
                                }

                                if let Some(choice) = stream_response.choices.first() {
                                    let content = &choice.delta.content;
                                    if !content.is_empty() {
                                        total_content_received.push_str(content);
                                        for ch in content.chars() {
                                            if let Some(chunk_json) = json_parser.process_char(ch) {
                                                chunks_found_by_parser += 1;
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
                                                                eprintln!("   ✓ Event #{}", event_count);
                                                                Some(SimulationChunk::Event { data })
                                                            }
                                                            SimulationChunk::Update { .. } => {
                                                                eprintln!("⚠️  Received update chunk from LLM (unexpected, skipping)");
                                                                None
                                                            }
                                                            SimulationChunk::Complete { data } => {
                                                                received_complete_chunk = true;
                                                                eprintln!("   ✓ Completion summary");
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
                                                        if parse_errors <= 3 {
                                                            let preview = chunk_json.chars().take(100).collect::<String>();
                                                            eprintln!("   ⚠️  Parse error #{}: {} (skipping)", parse_errors, err);
                                                            eprintln!("      Preview: {}", preview);
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
                    eprintln!("   ✗ Stream error: {}", e);
                    break;
                }
            }
        }

        eprintln!("\n✓ Phase 2 Complete");
        eprintln!("   Events: {} | Parse errors: {} | Chunks found: {}", event_count, parse_errors, chunks_found_by_parser);

        if total_content_received.is_empty() {
            eprintln!("   ⚠️  Warning: No content received from LLM");
        } else {
            let preview = total_content_received.chars().take(500).collect::<String>();
            eprintln!("   Content preview (first 500 chars): {}", preview);
            if total_content_received.len() > 500 {
                eprintln!("   ... ({} total chars)", total_content_received.len());
            }
            if !total_content_received.trim_start().starts_with('[') {
                eprintln!("   ⚠️  Warning: Content does not start with '[' - JSON array expected");
            }
        }

        if !received_complete_chunk {
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
            if let Some(tt) = usage.total_tokens {
                eprintln!("   Tokens: {}", tt);
            }
        }
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
    db: std::sync::Arc<NeighborhoodDatabase>,
) -> Result<impl Stream<Item = Result<Bytes, std::io::Error>>, actix_web::Error> {
    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    let minimal_context_str = build_minimal_context(&request.neighborhood_context);
    let prompt = request.prompt.clone();

    eprintln!("\n🔄 Phase 1: Identifying Target Neighborhoods");
    eprintln!(
        "   Input: {} neighborhoods with minimal context",
        request.neighborhood_context.len()
    );

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

    eprintln!(
        "   ✓ Identified {} target neighborhoods",
        target_neighborhoods.len()
    );

    let estimated_events = target_neighborhoods.len() as u32;
    let update_chunk = SimulationChunk::Update {
        data: crate::types::SimulationUpdate {
            total: estimated_events,
        },
    };

    let update_bytes = if let Ok(json) = serde_json::to_string(&update_chunk) {
        let sse_data = format!("data: {}\n\n", json);
        Ok(Bytes::from(sse_data))
    } else {
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to serialize update chunk",
        ))
    };

    eprintln!("\n🔄 Phase 2: Loading Full Neighborhood Properties");
    let mut neighborhood_lookup = lookup_neighborhoods_by_names(&request.neighborhood_properties);

    let mut found_from_request = 0;
    let mut found_from_db = 0;
    let mut missing = Vec::new();

    for name in &target_neighborhoods {
        if !neighborhood_lookup.contains_key(name) {
            if let Some(neighborhood) = db.find_by_name(name) {
                neighborhood_lookup.insert(name.clone(), neighborhood);
                found_from_db += 1;
            } else {
                missing.push(name.clone());
            }
        } else {
            found_from_request += 1;
        }
    }

    eprintln!("   ✓ Found {} from request", found_from_request);
    if found_from_db > 0 {
        eprintln!("   ✓ Found {} from database", found_from_db);
    }
    if !missing.is_empty() {
        eprintln!("   ⚠️  Missing: {} neighborhoods", missing.len());
        eprintln!("      {:?}", missing);
    }

    let total_found = found_from_request + found_from_db;
    eprintln!(
        "   Total: {} of {} neighborhoods loaded",
        total_found,
        target_neighborhoods.len()
    );

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
