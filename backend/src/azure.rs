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

use crate::types::{
    NeighborhoodMetrics, NeighborhoodProperties, SimulationChunk, SimulationRequest,
};
use actix_web::web::Bytes;
use futures_util::{Stream, StreamExt};
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

#[derive(Debug, Deserialize)]
pub struct Delta {
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StreamChoice {
    pub index: u32,
    pub delta: Delta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StreamResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<StreamChoice>,
    pub created: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatCompletionRequest {
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "is_false")]
    pub stream: bool,
    #[serde(
        rename = "max_completion_tokens",
        skip_serializing_if = "Option::is_none"
    )]
    pub max_completion_tokens: Option<u32>,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default = "default_model")]
    pub model: String,
}

fn is_false(b: &bool) -> bool {
    !b
}

fn default_temperature() -> f32 {
    1.0
}

fn default_top_p() -> f32 {
    1.0
}

fn default_model() -> String {
    "grok-4-fast-reasoning".to_string()
}

fn complete_interdependent_metrics(
    metrics: &mut NeighborhoodMetrics,
    original_neighborhood: &NeighborhoodProperties,
) {
    use crate::types::Derived;

    if let Some(ref edu_dist) = metrics.education_distribution {
        let higher_ed_percent = edu_dist.bachelors + edu_dist.graduate;
        match &mut metrics.derived {
            Some(derived) => derived.higher_ed_percent = higher_ed_percent,
            None => {
                metrics.derived = Some(Derived {
                    higher_ed_percent,
                    density_index: original_neighborhood.derived.density_index,
                })
            }
        }
    }

    if let Some(ref race_dist) = metrics.race_distribution {
        let diversity_index = 1.0
            - [
                race_dist.white,
                race_dist.black,
                race_dist.asian,
                race_dist.mixed,
                race_dist.hispanic,
            ]
            .iter()
            .map(|&p| (p / 100.0).powi(2))
            .sum::<f64>();

        metrics.diversity_index = Some(diversity_index);
    }

    if let Some(population_total) = metrics.population_total {
        let density_index = population_total as f64 / original_neighborhood.area_acres;
        match &mut metrics.derived {
            Some(derived) => derived.density_index = density_index,
            None => {
                metrics.derived = Some(Derived {
                    higher_ed_percent: original_neighborhood.derived.higher_ed_percent,
                    density_index,
                })
            }
        }
    }
}

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

fn build_neighborhoods_context(properties: &[NeighborhoodProperties]) -> String {
    if properties.is_empty() {
        return "No specific neighborhood data provided. Use general Atlanta neighborhood characteristics.".to_string();
    }

    properties
        .iter()
        .map(|n| {
            let area_sq_miles = n.area_acres / 640.0;
            let neighbors = n.neighboring_neighborhoods.as_ref()
                .map(|v| v.join(", "))
                .unwrap_or_else(|| "None specified".to_string());
            let current_events = n.current_events.as_ref()
                .map(|v| v.join("; "))
                .unwrap_or_else(|| "None specified".to_string());
            let baseline = n.baseline_description.as_ref()
                .map(|s| s.as_str())
                .unwrap_or("No baseline description available");

            format!(
                "Neighborhood: {}\nArea: {:.2} sq miles\nPopulation: {}\nMedian Income: ${}\n\
                 Median Home Value: ${}\nHousing Units: {}\nVacancy Rate: {:.1}%\n\
                 Owner Occupancy: {:.1}%\nDiversity Index: {:.2}\nLivability Index: {:.1}\n\
                 Average Commute: {:.1} minutes\nCar Dependence: {:.1}%\nTransit Usage: {:.1}%\n\
                 Education: {:.1}% Bachelor's+, {:.1}% Graduate\n\
                 Race Distribution: White {:.1}%, Black {:.1}%, Asian {:.1}%, Mixed {:.1}%, Hispanic {:.1}%\n\
                 Baseline Description: {}\nCurrent Events: {}\nNeighboring Neighborhoods: {}",
                n.name, area_sq_miles, n.population_total, n.median_income, n.median_home_value,
                n.housing_units, n.vacancy_rate, n.owner_occupancy, n.diversity_index,
                n.livability_index, n.commute.avg_minutes, n.commute.car_dependence,
                n.commute.transit_usage, n.derived.higher_ed_percent, n.education_distribution.graduate,
                n.race_distribution.white, n.race_distribution.black, n.race_distribution.asian,
                n.race_distribution.mixed, n.race_distribution.hispanic, baseline, current_events, neighbors
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n")
}

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
        let mut chunk_buffer = String::new();
        let mut sse_buffer = String::new();
        let mut chunk_count = 0;
        let mut depth = 0;
        let mut json_started = false;
        let mut in_string = false;
        let mut escape_next = false;
        let mut collecting_chunk = false;
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
                                            if !json_started {
                                                if ch == '[' {
                                                    json_started = true;
                                                    depth = 1;
                                                }
                                                continue;
                                            }

                                            let mut should_push = collecting_chunk;
                                            let mut finalize_chunk = false;

                                            if escape_next {
                                                if should_push {
                                                    chunk_buffer.push(ch);
                                                }
                                                escape_next = false;
                                                continue;
                                            }

                                            if ch == '\\' && in_string {
                                                if should_push {
                                                    chunk_buffer.push(ch);
                                                }
                                                escape_next = true;
                                                continue;
                                            }

                                            if ch == '"' {
                                                if should_push {
                                                    chunk_buffer.push(ch);
                                                }
                                                in_string = !in_string;
                                                continue;
                                            }

                                            if !in_string {
                                                match ch {
                                                    '[' => depth += 1,
                                                    '{' => {
                                                        depth += 1;
                                                        if depth == 2 {
                                                            collecting_chunk = true;
                                                            should_push = true;
                                                            chunk_buffer.clear();
                                                        }
                                                    }
                                                    ']' => {
                                                        if depth > 0 {
                                                            depth -= 1;
                                                        }
                                                    }
                                                    '}' => {
                                                        if depth > 0 {
                                                            depth -= 1;
                                                        }
                                                        if depth == 1 && collecting_chunk {
                                                            finalize_chunk = true;
                                                        }
                                                    }
                                                    _ => {}
                                                }
                                            }

                                            if should_push {
                                                chunk_buffer.push(ch);
                                            }

                                            if finalize_chunk {
                                                let chunk_json = chunk_buffer.clone();
                                                chunk_buffer.clear();
                                                collecting_chunk = false;

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
