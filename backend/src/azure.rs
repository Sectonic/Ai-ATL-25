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
///   Each event includes a single combined metrics object with both zone-level and city-wide metrics
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
    eprintln!("\n=== STARTING AI SIMULATION ===");

    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    eprintln!("✓ Azure API key found");

    // Serialize city metrics for inclusion in the prompt
    let city_metrics_json = serde_json::to_string(&request.city_metrics).map_err(|e| {
        eprintln!("✗ Failed to serialize city metrics: {}", e);
        actix_web::error::ErrorInternalServerError(format!("Serialization error: {}", e))
    })?;

    eprintln!("✓ City metrics serialized");

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
                let area_sq_miles = n.area_acres / 640.0;
                format!(
                    "Neighborhood: {} (Population: {}, Area: {:.2} sq miles, Income: ${}, Housing Units: {})",
                    n.name,
                    n.population_total,
                    area_sq_miles,
                    n.median_income,
                    n.housing_units
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

CLIENT-SIDE METRICS AND CHARTS:
The frontend displays the following metrics and visualizations that you should consider when generating updates:

1. Overview Section (City-wide metrics):
   - Population (displayed in thousands)
   - Average Income / Median Income (displayed in thousands of dollars)
   - Housing Affordability Index (0-100 scale)
   - Environmental Score / Air Quality Index (0-100 scale)
   - Livability Index (0-100 scale, measures overall quality of life)
   - Traffic Congestion Index (0-100 scale, displayed as percentage)

2. Demographics Section:
   - Race Distribution (Doughnut Chart): White, Black, Asian, Mixed, Hispanic percentages
   - Diversity Index (0-1 scale, displayed as decimal)

3. Education Section:
   - Education Distribution (Doughnut Chart): High School or Less, Some College, Bachelor's, Graduate percentages
   - Higher Education Percent (percentage with Bachelor's or higher)

4. Cost of Living Section:
   - Median Income (displayed in thousands)
   - Median Home Value (displayed in thousands)
   - Affordability Index (ratio of income to home value)

5. Commute Section:
   - Average Commute Minutes
   - Commute Mode Distribution (Segmented Bar): Car dependence %, Transit usage %, Other %

6. Housing Stability Section:
   - Vacancy Rate (percentage)
   - Owner Occupancy Rate (percentage)

7. Urban Profile Section (Radar Chart):
   - Income (normalized 0-100)
   - Education (higher ed percent)
   - Diversity (diversity index * 100)
   - Density (density index * 100)
   - Affordability (affordability index * 10)

IMPORTANT: When generating event chunks with embedded metrics:
- Always include a single "metrics" object in each event chunk that combines both zone-level and city-wide metrics
- Use the provided neighborhood_properties data to generate accurate zone-level metrics for the specific neighborhood where the event occurs
- For zone-level metrics: Include population, housingUnits, trafficFlow, and economicIndex based on the neighborhood's current properties
- For city-wide metrics: Always update population, averageIncome, and trafficCongestionIndex if the event affects them
- Update housingAffordabilityIndex for housing-related events
- Update airQualityIndex for environmental events
- Update livabilityIndex for events that affect overall quality of life (combines factors like safety, amenities, walkability, etc.)
- Consider how changes affect the Urban Profile radar chart metrics
- Each event should mutate the zone stats and city metrics, so include cumulative updates
- The metrics object should reflect realistic changes based on the neighborhood's current demographic and economic characteristics from neighborhood_properties

CRITICAL OUTPUT FORMAT REQUIREMENTS:
You MUST return a valid JSON array. The response must be:
- A JSON array starting with [ and ending with ]
- Each element is a JSON object with a "type" field and a "data" field
- NO markdown code blocks (no ```json or ```)
- NO explanatory text before or after the JSON
- NO comments or additional formatting
- Valid JSON that can be parsed directly

The response must be a JSON array of simulation chunks. Each chunk must be one of these types:

1. Event chunks (each event must include a single combined metrics object):
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
       "population": <number> (optional, zone-level population based on neighborhood_properties),
       "populationChange": <number> (optional),
       "housingUnits": <number> (optional, zone-level based on neighborhood_properties),
       "housingUnitsChange": <number> (optional),
       "trafficFlow": <number 0-100> (optional, zone-level traffic impact),
       "trafficFlowChange": <number> (optional),
       "economicIndex": <number 0-100> (optional, zone-level economic impact),
       "economicIndexChange": <number> (optional),
       "averageIncome": <number> (optional, city-wide average income),
       "averageIncomeChange": <number> (optional),
       "unemploymentRate": <number> (optional, city-wide),
       "unemploymentRateChange": <number> (optional),
       "housingAffordabilityIndex": <number 0-100> (optional, city-wide),
       "housingAffordabilityIndexChange": <number> (optional),
       "trafficCongestionIndex": <number 0-100> (optional, city-wide),
       "trafficCongestionIndexChange": <number> (optional),
       "airQualityIndex": <number 0-100> (optional, city-wide),
       "airQualityIndexChange": <number> (optional),
       "livabilityIndex": <number 0-100> (optional, city-wide),
       "livabilityIndexChange": <number> (optional)
     }} (optional, include if event affects metrics - use neighborhood_properties to generate accurate zone-level data)
   }}}}

2. Complete chunk (exactly one, at the end):
   {{"type": "complete", "data": {{
     "summary": "<brief summary of the simulation results>"
   }}}}

Example valid response format:
[
  {{"type": "event", "data": {{
    "id": "event-1",
    "zoneId": "Ridgewood Heights",
    "zoneName": "Ridgewood Heights",
    "type": "transportation",
    "title": "Light Rail Construction Begins",
    "description": "New light rail construction begins...",
    "severity": 0.7,
    "positivity": -0.3,
    "coordinates": [33.826, -84.443],
    "metrics": {{
      "zoneId": "Ridgewood Heights",
      "zoneName": "Ridgewood Heights",
      "population": 500,
      "populationChange": 4,
      "housingUnits": 170,
      "trafficFlow": 65,
      "economicIndex": 72,
      "averageIncome": 55000,
      "averageIncomeChange": 2.5,
      "trafficCongestionIndex": 68,
      "trafficCongestionIndexChange": 3
    }}
  }}}},
  {{"type": "complete", "data": {{"summary": "The policy implementation shows..."}}}}
]

Important Guidelines:
- Use neighborhood names from the provided neighborhood data for zoneId and zoneName
- The event "type" field should be a descriptive string that best categorizes the event based on the policy being simulated (e.g., "transportation", "housing", "economic", "environmental", "infrastructure", "education", "healthcare", "public-safety", etc.). Choose the most appropriate type based on the policy's primary impact.
- Each event MUST include a "title" field with a concise, descriptive title (3-8 words) that summarizes the event
- Make changes realistic and proportional to the policy's scope
- Consider both positive and negative impacts
- Use Atlanta-specific context (neighborhoods, demographics, geography)
- Ensure all numeric values are realistic
- Events should be specific and actionable
- Each event chunk MUST include a single "metrics" object that combines both zone-level and city-wide metrics
- Use the neighborhood_properties data provided to generate accurate zone-level metrics (population, housingUnits, etc.) based on the actual neighborhood characteristics
- Zone-level metrics (population, housingUnits, trafficFlow, economicIndex) should be based on the neighborhood_properties for that specific zone
- City-wide metrics (averageIncome, trafficCongestionIndex, housingAffordabilityIndex, airQualityIndex, livabilityIndex) should show cumulative city-wide aggregate changes
- When generating event chunks, ensure metrics updates at least 2-3 key city-wide metrics that are prominently displayed (population, averageIncome, trafficCongestionIndex, housingAffordabilityIndex, or airQualityIndex)
- Consider how metrics affect the Urban Profile radar chart (Income, Education, Diversity, Density, Affordability)
- Generate 3-6 events (each with a combined metrics object), and 1 complete chunk
- Return ONLY the JSON array, nothing else"#,
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

Generate a complete simulation with events (each containing a combined metrics object). Use the neighborhood_properties data to generate accurate zone-level metrics. Return the results as a JSON array of simulation chunks."#,
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
        max_tokens: 100000,
        temperature: 0.7, // Balance between creativity and consistency
        top_p: 0.9,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        model: default_model(),
    };

    // Azure AI endpoint URL
    let url = "https://aiatlai.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview";
    let client = reqwest::Client::new();

    eprintln!("📤 Sending request to Azure AI...");
    eprintln!("   Model: {}", chat_request.model);
    eprintln!("   Max tokens: {}", chat_request.max_tokens);
    eprintln!("   Temperature: {}", chat_request.temperature);

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&chat_request)
        .send()
        .await
        .map_err(|e| {
            eprintln!("✗ Azure API request failed: {}", e);
            actix_web::error::ErrorInternalServerError(format!("Request failed: {}", e))
        })?;

    eprintln!("📥 Received response from Azure AI");

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
    // - Event chunks with traffic, housing, economic, etc. events (each with a combined metrics object)
    // - Complete chunk with final summary
    eprintln!("🔍 Parsing AI response...");

    let chunks: Vec<SimulationChunk> = serde_json::from_str(cleaned_response).map_err(|e| {
        eprintln!("✗ Failed to parse AI response. Error: {}", e);

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

    eprintln!("✓ Successfully parsed {} simulation chunks", chunks.len());
    eprintln!("=== END AI SIMULATION ===\n");

    Ok(chunks)
}
