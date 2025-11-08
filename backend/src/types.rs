//! Data Types for City Simulation
//!
//! This module defines all the data structures used throughout the simulation system:
//! - Neighborhood demographic and geographic data
//! - City-wide metrics and their changes
//! - Simulation events and zone updates
//! - Request/response structures for the API

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EducationDistribution {
    #[serde(rename = "high_school_or_less")]
    pub high_school_or_less: f64,
    #[serde(rename = "some_college")]
    pub some_college: f64,
    pub bachelors: f64,
    pub graduate: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RaceDistribution {
    pub white: f64,
    pub black: f64,
    pub asian: f64,
    pub mixed: f64,
    pub hispanic: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Commute {
    #[serde(rename = "avg_minutes")]
    pub avg_minutes: f64,
    #[serde(rename = "car_dependence")]
    pub car_dependence: f64,
    #[serde(rename = "transit_usage")]
    pub transit_usage: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Derived {
    #[serde(rename = "higher_ed_percent")]
    pub higher_ed_percent: f64,
    #[serde(rename = "density_index")]
    pub density_index: f64,
}

/// Neighborhood demographic and geographic properties
///
/// Contains comprehensive data about Atlanta neighborhoods including:
/// - Geographic information (area)
/// - Demographic data (population, race, education)
/// - Housing data (units, ownership, vacancy)
/// - Economic indicators (household income, home values)
/// - Commute patterns
/// - Contextual information (baseline description, current events, neighboring neighborhoods)
///
/// This data is used by the AI to generate realistic, neighborhood-specific
/// simulation results based on actual Atlanta neighborhood characteristics.
/// The `name` field serves as the unique identifier for each neighborhood.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NeighborhoodProperties {
    pub name: String,
    pub npu: String,
    #[serde(rename = "area_acres")]
    pub area_acres: f64,
    #[serde(rename = "population_total")]
    pub population_total: i32,
    #[serde(rename = "median_age")]
    pub median_age: f64,
    #[serde(rename = "population_density")]
    pub population_density: f64,
    #[serde(rename = "median_income")]
    pub median_income: i32,
    #[serde(rename = "median_home_value")]
    pub median_home_value: i32,
    #[serde(rename = "affordability_index")]
    pub affordability_index: f64,
    #[serde(rename = "housing_units")]
    pub housing_units: i32,
    pub households: i32,
    #[serde(rename = "vacant_units")]
    pub vacant_units: i32,
    #[serde(rename = "vacancy_rate")]
    pub vacancy_rate: f64,
    #[serde(rename = "owner_occupancy")]
    pub owner_occupancy: f64,
    #[serde(rename = "housing_density")]
    pub housing_density: f64,
    #[serde(rename = "education_distribution")]
    pub education_distribution: EducationDistribution,
    #[serde(rename = "race_distribution")]
    pub race_distribution: RaceDistribution,
    #[serde(rename = "diversity_index")]
    pub diversity_index: f64,
    #[serde(rename = "livability_index")]
    pub livability_index: f64,
    pub commute: Commute,
    pub derived: Derived,
    #[serde(
        rename = "baseline_description",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub baseline_description: Option<String>,
    #[serde(
        rename = "current_events",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub current_events: Option<Vec<String>>,
    #[serde(
        rename = "neighboring_neighborhoods",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub neighboring_neighborhoods: Option<Vec<String>>,
}

/// Partial neighborhood metrics for event updates
///
/// This represents a partial update to neighborhood properties.
/// Events only include the fields that change, not the complete state.
/// All fields are optional since events may affect different aspects of a neighborhood.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct NeighborhoodMetrics {
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub population_total: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub median_age: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub population_density: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub median_income: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub median_home_value: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub affordability_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub housing_units: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub households: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub vacant_units: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub vacancy_rate: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub owner_occupancy: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub housing_density: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub education_distribution: Option<EducationDistribution>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub race_distribution: Option<RaceDistribution>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub diversity_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub livability_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub commute: Option<Commute>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub derived: Option<Derived>,
}

impl Default for NeighborhoodMetrics {
    fn default() -> Self {
        NeighborhoodMetrics {
            zone_id: String::new(),
            zone_name: String::new(),
            population_total: None,
            median_age: None,
            population_density: None,
            median_income: None,
            median_home_value: None,
            affordability_index: None,
            housing_units: None,
            households: None,
            vacant_units: None,
            vacancy_rate: None,
            owner_occupancy: None,
            housing_density: None,
            education_distribution: None,
            race_distribution: None,
            diversity_index: None,
            livability_index: None,
            commute: None,
            derived: None,
        }
    }
}

/// An event that occurs as a result of a policy implementation
///
/// Events represent specific occurrences like construction starting, traffic changes,
/// or new developments. They are displayed on the map and in event panels.
///
/// ## Severity and Positivity
/// - `severity` (0.0 to 1.0): How impactful/significant the event is (affects visual prominence)
/// - `positivity` (-1.0 to 1.0): How positive/negative the event is (affects color: red to yellow to green)
///
/// ## Metrics
/// Each event includes a partial neighborhood metrics object that contains only the fields
/// that change as a result of this event. The client applies these partial updates incrementally
/// to build up the simulated neighborhood state.
#[derive(Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct EventNotification {
    pub id: String,
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub description: String,
    pub severity: f64,
    pub positivity: f64,
    pub coordinates: Vec<f64>,
    #[serde(rename = "metrics", skip_serializing_if = "Option::is_none")]
    pub metrics: Option<NeighborhoodMetrics>,
}

impl Default for EventNotification {
    fn default() -> Self {
        EventNotification {
            id: String::new(),
            zone_id: String::new(),
            zone_name: String::new(),
            event_type: String::new(),
            title: String::new(),
            description: String::new(),
            severity: 0.0,
            positivity: 0.0,
            coordinates: vec![],
            metrics: None,
        }
    }
}

/// A single chunk in the simulation stream
///
/// The simulation is streamed as a series of chunks. Each event chunk now contains
/// both the event data and its associated zone and city metrics, allowing the client
/// to track event-specific state and aggregate data for charts.
///
/// The `#[serde(tag = "type")]` attribute means the JSON includes a "type" field
/// that determines which variant to deserialize.
#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum SimulationChunk {
    #[serde(rename = "event")]
    Event { data: EventNotification },
    #[serde(rename = "complete")]
    Complete { data: SimulationComplete },
}

/// Completion message sent at the end of a simulation
#[derive(Debug, Deserialize, Serialize)]
pub struct SimulationComplete {
    pub summary: String,
}

/// Request payload for the simulation endpoint
///
/// Contains all the information needed to generate a simulation:
/// - The policy proposal to simulate
/// - Optional zone and neighborhood data for more accurate results
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SimulationRequest {
    pub prompt: String,
    #[serde(rename = "selectedZones", default)]
    pub selected_zones: Vec<String>,
    #[serde(rename = "neighborhoodProperties", default)]
    pub neighborhood_properties: Vec<NeighborhoodProperties>,
}
