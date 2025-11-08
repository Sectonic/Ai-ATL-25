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
}

/// City-wide metrics representing the overall state of Atlanta
///
/// These metrics are used as baseline data when simulating policy impacts.
/// The AI uses these values to calculate realistic changes from policy implementations.
///
/// All metrics have optional "Change" fields that represent deltas from the baseline.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CityMetrics {
    pub population: f64,
    #[serde(rename = "populationChange", skip_serializing_if = "Option::is_none")]
    pub population_change: Option<f64>,
    #[serde(rename = "averageIncome")]
    pub average_income: f64,
    #[serde(
        rename = "averageIncomeChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub average_income_change: Option<f64>,
    #[serde(rename = "unemploymentRate")]
    pub unemployment_rate: f64,
    #[serde(
        rename = "unemploymentRateChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub unemployment_rate_change: Option<f64>,
    #[serde(rename = "housingAffordabilityIndex")]
    pub housing_affordability_index: f64,
    #[serde(
        rename = "housingAffordabilityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub housing_affordability_index_change: Option<f64>,
    #[serde(rename = "trafficCongestionIndex")]
    pub traffic_congestion_index: f64,
    #[serde(
        rename = "trafficCongestionIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub traffic_congestion_index_change: Option<f64>,
    #[serde(rename = "airQualityIndex")]
    pub air_quality_index: f64,
    #[serde(
        rename = "airQualityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub air_quality_index_change: Option<f64>,
    #[serde(rename = "livabilityIndex")]
    pub livability_index: f64,
    #[serde(
        rename = "livabilityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub livability_index_change: Option<f64>,
}

/// Types of events that can occur in a simulation
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EventType {
    Traffic,
    Housing,
    Population,
    Economic,
    Environmental,
}

/// An event that occurs as a result of a policy implementation
///
/// Events represent specific occurrences like construction starting, traffic changes,
/// or new developments. They are displayed on the map and in event panels.
///
/// ## Severity and Positivity
/// - `severity` (0.0 to 1.0): How impactful/significant the event is (affects visual prominence)
/// - `positivity` (-1.0 to 1.0): How positive/negative the event is (affects color: red to yellow to green)
#[derive(Debug, Deserialize, Serialize)]
pub struct EventNotification {
    pub id: String,
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    #[serde(rename = "type")]
    pub event_type: EventType,
    pub description: String,
    pub severity: f64,
    pub positivity: f64,
    pub timestamp: i64,
    pub coordinates: Vec<f64>,
}

/// Zone-level metrics for a specific neighborhood, district, or area
///
/// Zones can represent neighborhoods, districts, counties, or buildings.
/// This data shows how policy impacts vary across different areas of the city.
#[derive(Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct ZoneData {
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub population: Option<f64>,
    #[serde(rename = "populationChange", skip_serializing_if = "Option::is_none")]
    pub population_change: Option<f64>,
    #[serde(rename = "housingUnits", skip_serializing_if = "Option::is_none")]
    pub housing_units: Option<f64>,
    #[serde(rename = "housingUnitsChange", skip_serializing_if = "Option::is_none")]
    pub housing_units_change: Option<f64>,
    #[serde(rename = "trafficFlow", skip_serializing_if = "Option::is_none")]
    pub traffic_flow: Option<f64>,
    #[serde(rename = "trafficFlowChange", skip_serializing_if = "Option::is_none")]
    pub traffic_flow_change: Option<f64>,
    #[serde(rename = "economicIndex", skip_serializing_if = "Option::is_none")]
    pub economic_index: Option<f64>,
    #[serde(
        rename = "economicIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub economic_index_change: Option<f64>,
}

impl Default for ZoneData {
    fn default() -> Self {
        ZoneData {
            zone_id: String::new(),
            zone_name: String::new(),
            population: None,
            population_change: None,
            housing_units: None,
            housing_units_change: None,
            traffic_flow: None,
            traffic_flow_change: None,
            economic_index: None,
            economic_index_change: None,
        }
    }
}

/// Partial city metrics update - only includes fields that have changed
///
/// Used in metricsUpdate chunks to send only the metrics that changed,
/// allowing the frontend to merge with existing metrics. All fields are optional
/// and default to None if not present in the JSON.
#[derive(Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct PartialCityMetrics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub population: Option<f64>,
    #[serde(rename = "populationChange", skip_serializing_if = "Option::is_none")]
    pub population_change: Option<f64>,
    #[serde(rename = "averageIncome", skip_serializing_if = "Option::is_none")]
    pub average_income: Option<f64>,
    #[serde(
        rename = "averageIncomeChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub average_income_change: Option<f64>,
    #[serde(rename = "unemploymentRate", skip_serializing_if = "Option::is_none")]
    pub unemployment_rate: Option<f64>,
    #[serde(
        rename = "unemploymentRateChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub unemployment_rate_change: Option<f64>,
    #[serde(
        rename = "housingAffordabilityIndex",
        skip_serializing_if = "Option::is_none"
    )]
    pub housing_affordability_index: Option<f64>,
    #[serde(
        rename = "housingAffordabilityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub housing_affordability_index_change: Option<f64>,
    #[serde(
        rename = "trafficCongestionIndex",
        skip_serializing_if = "Option::is_none"
    )]
    pub traffic_congestion_index: Option<f64>,
    #[serde(
        rename = "trafficCongestionIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub traffic_congestion_index_change: Option<f64>,
    #[serde(rename = "airQualityIndex", skip_serializing_if = "Option::is_none")]
    pub air_quality_index: Option<f64>,
    #[serde(
        rename = "airQualityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub air_quality_index_change: Option<f64>,
    #[serde(rename = "livabilityIndex", skip_serializing_if = "Option::is_none")]
    pub livability_index: Option<f64>,
    #[serde(
        rename = "livabilityIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub livability_index_change: Option<f64>,
}

impl Default for PartialCityMetrics {
    fn default() -> Self {
        PartialCityMetrics {
            population: None,
            population_change: None,
            average_income: None,
            average_income_change: None,
            unemployment_rate: None,
            unemployment_rate_change: None,
            housing_affordability_index: None,
            housing_affordability_index_change: None,
            traffic_congestion_index: None,
            traffic_congestion_index_change: None,
            air_quality_index: None,
            air_quality_index_change: None,
            livability_index: None,
            livability_index_change: None,
        }
    }
}

/// A single chunk in the simulation stream
///
/// The simulation is streamed as a series of chunks. Each chunk represents
/// a different type of update: events, zone updates, metrics changes, or completion.
///
/// The `#[serde(tag = "type")]` attribute means the JSON includes a "type" field
/// that determines which variant to deserialize.
#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum SimulationChunk {
    #[serde(rename = "event")]
    Event { data: EventNotification },
    #[serde(rename = "zoneUpdate")]
    ZoneUpdate { data: ZoneData },
    #[serde(rename = "metricsUpdate")]
    MetricsUpdate { data: PartialCityMetrics },
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
/// - Current city state (metrics)
/// - Optional zone and neighborhood data for more accurate results
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SimulationRequest {
    pub prompt: String,
    #[serde(rename = "cityMetrics")]
    pub city_metrics: CityMetrics,
    #[serde(rename = "selectedZones", default)]
    pub selected_zones: Vec<String>,
    #[serde(rename = "neighborhoodProperties", default)]
    pub neighborhood_properties: Vec<NeighborhoodProperties>,
}
