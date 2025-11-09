//! Utility Functions
//!
//! This module contains utility functions used across the application:
//! - Metric calculation and completion logic
//! - Data formatting and transformation
//! - JSON parsing utilities

use crate::types::{MinimalNeighborhoodContext, NeighborhoodMetrics, NeighborhoodProperties};

/// Completes interdependent metric calculations for partial neighborhood updates
///
/// When the AI generates partial metric updates, some fields depend on others:
/// - `higher_ed_percent` is derived from `education_distribution` (bachelors + graduate)
/// - `diversity_index` is calculated from `race_distribution` using Shannon diversity
/// - `density_index` is calculated from `population_total` and `area_acres`
///
/// This function ensures these derived fields are automatically computed when
/// their dependencies are present in the partial update.
///
/// # Arguments
///
/// * `metrics` - The partial metrics update to complete (modified in place)
/// * `original_neighborhood` - The baseline neighborhood data used for fallback values
pub fn complete_interdependent_metrics(
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

/// Formats minimal neighborhood context into a human-readable string for Phase 1
///
/// Converts minimal neighborhood context (name + contextual fields) into a formatted
/// text description for the LLM to identify which neighborhoods should have events.
///
/// # Arguments
///
/// * `context` - Slice of minimal neighborhood context to format
///
/// # Returns
///
/// A formatted string with minimal neighborhood data, or a fallback message
/// if no context is provided
pub fn build_minimal_context(context: &[MinimalNeighborhoodContext]) -> String {
    if context.is_empty() {
        return "No specific neighborhood data provided. Use general Atlanta neighborhood characteristics.".to_string();
    }

    context
        .iter()
        .map(|n| {
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
                "Neighborhood: {}\nBaseline Description: {}\nCurrent Events: {}\nNeighboring Neighborhoods: {}",
                n.name, baseline, current_events, neighbors
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n")
}

/// Formats neighborhood properties into a human-readable context string
///
/// Converts the structured neighborhood data into a formatted text description
/// that can be used by AI systems or for display purposes.
/// Includes demographic, economic, housing, and contextual information.
///
/// # Arguments
///
/// * `properties` - Slice of neighborhood properties to format
///
/// # Returns
///
/// A formatted string with all neighborhood data, or a fallback message
/// if no properties are provided
pub fn build_neighborhoods_context(properties: &[NeighborhoodProperties]) -> String {
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

/// State machine for parsing JSON array chunks from a streaming response
///
/// This parser tracks bracket depth to extract complete JSON objects from
/// a streaming JSON array. It handles string escaping and maintains state
/// across character-by-character parsing.
pub struct JsonArrayChunkParser {
    chunk_buffer: String,
    depth: i32,
    json_started: bool,
    in_string: bool,
    escape_next: bool,
    collecting_chunk: bool,
}

impl JsonArrayChunkParser {
    /// Creates a new parser instance
    pub fn new() -> Self {
        Self {
            chunk_buffer: String::new(),
            depth: 0,
            json_started: false,
            in_string: false,
            escape_next: false,
            collecting_chunk: false,
        }
    }

    /// Processes a single character and returns whether a complete chunk was found
    ///
    /// # Arguments
    ///
    /// * `ch` - The character to process
    ///
    /// # Returns
    ///
    /// `Some(String)` if a complete JSON chunk was found, `None` otherwise.
    /// The returned string is the complete JSON object that can be parsed.
    pub fn process_char(&mut self, ch: char) -> Option<String> {
        if !self.json_started {
            if ch == '[' {
                self.json_started = true;
                self.depth = 1;
            }
            return None;
        }

        let mut should_push = self.collecting_chunk;
        let mut finalize_chunk = false;

        if self.escape_next {
            if should_push {
                self.chunk_buffer.push(ch);
            }
            self.escape_next = false;
            return None;
        }

        if ch == '\\' && self.in_string {
            if should_push {
                self.chunk_buffer.push(ch);
            }
            self.escape_next = true;
            return None;
        }

        if ch == '"' {
            if should_push {
                self.chunk_buffer.push(ch);
            }
            self.in_string = !self.in_string;
            return None;
        }

        if !self.in_string {
            match ch {
                '[' => {
                    self.depth += 1;
                }
                '{' => {
                    self.depth += 1;
                    if self.depth == 2 {
                        self.collecting_chunk = true;
                        should_push = true;
                        self.chunk_buffer.clear();
                    }
                }
                ']' => {
                    if self.depth > 0 {
                        self.depth -= 1;
                    }
                }
                '}' => {
                    if self.depth > 0 {
                        self.depth -= 1;
                    }
                    if self.depth == 1 && self.collecting_chunk {
                        finalize_chunk = true;
                    }
                }
                _ => {}
            }
        }

        if should_push {
            self.chunk_buffer.push(ch);
        }

        if finalize_chunk {
            let chunk_json = self.chunk_buffer.clone();
            self.chunk_buffer.clear();
            self.collecting_chunk = false;
            return Some(chunk_json);
        }

        None
    }
}

impl Default for JsonArrayChunkParser {
    fn default() -> Self {
        Self::new()
    }
}

/// Looks up full neighborhood properties by name
///
/// Creates a HashMap from neighborhood names to their full properties
/// for efficient lookup during Phase 2 event generation.
///
/// # Arguments
///
/// * `properties` - Slice of full neighborhood properties
///
/// # Returns
///
/// A HashMap keyed by neighborhood name
pub fn lookup_neighborhoods_by_names(
    properties: &[NeighborhoodProperties],
) -> std::collections::HashMap<String, NeighborhoodProperties> {
    properties
        .iter()
        .map(|n| (n.name.clone(), n.clone()))
        .collect()
}
