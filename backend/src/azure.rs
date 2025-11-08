use crate::types::{SimulationChunk, SimulationRequest};
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

pub async fn generate_simulation(
    request: SimulationRequest,
) -> Result<Vec<SimulationChunk>, actix_web::Error> {
    let api_key = env::var("AZURE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("AZURE_API_KEY not set"))?;

    let city_metrics_json = serde_json::to_string(&request.city_metrics).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Serialization error: {}", e))
    })?;

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

    let selected_zones_str = if request.selected_zones.is_empty() {
        "All zones (city-wide impact)".to_string()
    } else {
        request.selected_zones.join(", ")
    };

    let user_prompt = format!(
        r#"Simulate the following policy proposal:

Policy: {}

Selected Zones: {}

Generate a complete simulation with events, zone updates, and metrics changes. Return the results as a JSON array of simulation chunks."#,
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
        stream: false,
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
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
            actix_web::error::ErrorInternalServerError(format!("Request failed: {}", e))
        })?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(actix_web::error::ErrorInternalServerError(format!(
            "API request failed with status {}: {}",
            status, error_text
        )));
    }

    let response_body: ChatCompletionResponse = response.json().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to parse response: {}", e))
    })?;

    let ai_response = response_body
        .choices
        .first()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No response from AI"))?
        .message
        .content
        .clone();

    let cleaned_response = ai_response
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let chunks: Vec<SimulationChunk> = serde_json::from_str(cleaned_response).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!(
            "Failed to parse simulation chunks: {}. Response was: {}",
            e, ai_response
        ))
    })?;

    Ok(chunks)
}
