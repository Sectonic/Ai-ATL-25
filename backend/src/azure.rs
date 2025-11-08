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
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
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
    200000 // 200k tokens
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

/// Generates a city policy simulation using Azure AI
///
/// This function:
/// 1. Builds a comprehensive prompt with city metrics and neighborhood data
/// 2. Sends the prompt to Azure AI with instructions for generating realistic simulations
/// 3. Parses the AI response into structured simulation chunks
/// 4. Returns a vector of chunks ready to be streamed to the client
///
/// ## Prompt Structure
///
/// The AI receives:
/// - System prompt: Instructions on how to generate simulations
/// - Current city metrics: Baseline data for the city
/// - Neighborhood properties: Demographic and housing data for affected areas
/// - User prompt: The specific policy proposal to simulate
///
/// ## AI Instructions
///
/// The AI is instructed to generate:
/// - 3-6 event notifications (traffic, housing, population, economic, environmental)
/// - 2-5 zone updates (neighborhood-level changes)
/// - 1 metrics update (city-wide changes)
/// - 1 completion summary
///
/// ## Error Handling
///
/// Returns detailed error messages if:
/// - API key is missing
/// - Azure API request fails
/// - Response parsing fails (with full response logged for debugging)
pub async fn generate_simulation(
    request: SimulationRequest,
) -> Result<Vec<SimulationChunk>, actix_web::Error> {
    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    // Serialize city metrics for inclusion in the prompt
    let city_metrics_json = serde_json::to_string(&request.city_metrics).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Serialization error: {}", e))
    })?;

    // Build a summary of neighborhood properties for the AI prompt
    // If no specific neighborhoods provided, use general Atlanta characteristics
    let neighborhoods_summary = if request.neighborhood_properties.is_empty() {
        "No specific neighborhood data provided. Use general Atlanta neighborhood characteristics."
            .to_string()
    } else {
        let summaries: Vec<String> = request.neighborhood_properties
            .iter()
            .take(5)
            .map(|n| {
                format!(
                    "Neighborhood: {} (Population: {:.0}, Area: {:.2} sq miles, Income: ${:.0}, Housing Units: {})",
                    n.name,
                    n.population,
                    n.sqmiles,
                    n.householdi as f64 / n.households.max(1.0),
                    n.housinguni
                )
            })
            .collect();
        summaries.join("\n")
    };

    // Construct the system prompt that instructs the AI on how to generate simulations
    // This includes the current city state and detailed output format requirements
    let system_prompt = format!(
        r#"You are an expert urban planning simulation AI for the city of Atlanta, Georgia. Your role is to analyze policy decisions and predict their realistic impacts across neighborhoods, zones, and city-wide metrics.

When given a policy proposal, you must:
1. Analyze the policy's potential effects on traffic, housing, population, economic factors, and environmental conditions
2. Consider the current city metrics and neighborhood characteristics provided
3. Generate realistic simulation results that reflect real-world urban dynamics
4. Return results in the exact JSON format specified below

Current City Metrics:
{}

Relevant Neighborhood Data:
{}

Output Format Requirements:
You must return a JSON array of simulation chunks. Each chunk must be one of these types:

1. Event chunks (3-6 events recommended):
   {{"type": "event", "data": {{
     "id": "event-<timestamp>-<index>",
     "zoneId": "<neighborhood-id>",
     "zoneName": "<neighborhood-name>",
     "type": "traffic" | "housing" | "population" | "economic" | "environmental",
     "description": "<detailed description of the event>",
     "severity": "low" | "medium" | "high",
     "timestamp": <unix-timestamp>,
     "coordinates": [<latitude>, <longitude>]
   }}}}

2. Zone Update chunks (2-5 zones recommended):
   {{"type": "zoneUpdate", "data": {{
     "zoneId": "<neighborhood-id>",
     "zoneName": "<neighborhood-name>",
     "population": <number>,
     "populationChange": <number> (optional),
     "housingUnits": <number>,
     "housingUnitsChange": <number> (optional),
     "trafficFlow": <number 0-100>,
     "trafficFlowChange": <number> (optional),
     "economicIndex": <number 0-100>,
     "economicIndexChange": <number> (optional)
   }}}}

3. Metrics Update chunk (exactly one):
   {{"type": "metricsUpdate", "data": {{
     "population": <number> (optional, only include if changed),
     "populationChange": <number> (optional, change from baseline),
     "averageIncome": <number> (optional, only include if changed),
     "averageIncomeChange": <number> (optional, change from baseline),
     "unemploymentRate": <number> (optional, only include if changed),
     "unemploymentRateChange": <number> (optional, change from baseline),
     "housingAffordabilityIndex": <number 0-100> (optional, only include if changed),
     "housingAffordabilityIndexChange": <number> (optional, change from baseline),
     "trafficCongestionIndex": <number 0-100> (optional, only include if changed),
     "trafficCongestionIndexChange": <number> (optional, change from baseline),
     "airQualityIndex": <number 0-100> (optional, only include if changed),
     "airQualityIndexChange": <number> (optional, change from baseline),
     "crimeRate": <number> (optional, only include if changed),
     "crimeRateChange": <number> (optional, change from baseline)
   }}}}
   
   Note: Only include fields that have changed. The frontend will merge these with existing metrics.

4. Complete chunk (exactly one, at the end):
   {{"type": "complete", "data": {{
     "summary": "<brief summary of the simulation results>"
   }}}}

Important Guidelines:
- Make changes realistic and proportional to the policy's scope
- Consider both positive and negative impacts
- Use Atlanta-specific context (neighborhoods, demographics, geography)
- Ensure all numeric values are realistic
- Events should be specific and actionable
- Zone updates should reflect differential impacts across neighborhoods
- Metrics updates should show city-wide aggregate changes
- Return ONLY valid JSON, no markdown formatting or code blocks"#,
        city_metrics_json, neighborhoods_summary
    );

    // Format selected zones for the prompt
    let selected_zones_str = if request.selected_zones.is_empty() {
        "All zones (city-wide impact)".to_string()
    } else {
        request.selected_zones.join(", ")
    };

    // Construct the user prompt with the specific policy proposal
    let user_prompt = format!(
        r#"Simulate the following policy proposal:

Policy: {}

Selected Zones: {}

Generate a complete simulation with events, zone updates, and metrics changes. Return the results as a JSON array of simulation chunks."#,
        request.prompt, selected_zones_str
    );

    // Build the Azure AI chat completion request
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
        stream: false, // We get the full response, then stream it ourselves
        max_tokens: 4000,
        temperature: 0.7, // Balance between creativity and consistency
        top_p: 0.9,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        model: default_model(),
    };

    // Azure AI endpoint URL
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
            actix_web::error::ErrorInternalServerError(format!("Request failed: {}", e))
        })?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to read response body: {}", e))
    })?;

    if !status.is_success() {
        eprintln!(
            "Azure API error response (status {}): {}",
            status, response_text
        );
        return Err(actix_web::error::ErrorInternalServerError(format!(
            "API request failed with status {}: {}",
            status, response_text
        )));
    }

    // Log basic response info (without the full message content)
    if let Ok(response_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
        if let Some(usage) = response_json.get("usage") {
            eprintln!("Azure API response - Tokens: {}", usage);
        }
    }

    let response_body: ChatCompletionResponse =
        serde_json::from_str(&response_text).map_err(|e| {
            eprintln!("Failed to parse ChatCompletionResponse. Error: {}", e);
            if let Ok(pretty_json) = serde_json::from_str::<serde_json::Value>(&response_text)
                .and_then(|v| serde_json::to_string_pretty(&v))
            {
                eprintln!("Response text (pretty):\n{}", pretty_json);
            } else {
                eprintln!("Response text (raw): {}", response_text);
            }
            actix_web::error::ErrorInternalServerError(format!(
                "Failed to parse response: {}. Response: {}",
                e,
                response_text.chars().take(1000).collect::<String>()
            ))
        })?;

    let ai_response = response_body
        .choices
        .first()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No response from AI"))?
        .message
        .content
        .clone();

    // Clean the response: AI sometimes wraps JSON in markdown code blocks
    // Remove ```json and ``` markers if present
    let cleaned_response = ai_response
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // Parse the cleaned JSON response into our SimulationChunk structures
    // The AI should return an array of chunks matching our enum variants:
    // - Event chunks with traffic, housing, economic, etc. events
    // - ZoneUpdate chunks with neighborhood-level changes
    // - MetricsUpdate chunk with city-wide changes
    // - Complete chunk with final summary
    let chunks: Vec<SimulationChunk> = serde_json::from_str(cleaned_response).map_err(|e| {
        eprintln!("Failed to parse AI response. Error: {}", e);

        // Pretty print the cleaned response if it's valid JSON
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&cleaned_response) {
            eprintln!(
                "Full cleaned response (pretty):\n{}",
                serde_json::to_string_pretty(&parsed).unwrap_or_default()
            );
        } else {
            eprintln!("Full cleaned response (raw): {}", cleaned_response);
        }

        // Try to pretty print original response if it contains JSON
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&ai_response) {
            eprintln!(
                "Original response (pretty):\n{}",
                serde_json::to_string_pretty(&parsed).unwrap_or_default()
            );
        } else {
            eprintln!("Original response (raw): {}", ai_response);
        }

        actix_web::error::ErrorInternalServerError(format!(
            "Failed to parse simulation chunks: {}. Full response length: {} chars",
            e,
            cleaned_response.len()
        ))
    })?;

    Ok(chunks)
}
