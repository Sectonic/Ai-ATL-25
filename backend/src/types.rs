//! Data Types for City Simulation
//!
//! This module defines all the data structures used throughout the simulation system:
//! - Neighborhood demographic and geographic data
//! - City-wide metrics and their changes
//! - Simulation events and zone updates
//! - Request/response structures for the API

use serde::{Deserialize, Serialize};

/// Neighborhood demographic and geographic properties
///
/// Contains comprehensive data about Atlanta neighborhoods including:
/// - Geographic information (area, coordinates, boundaries)
/// - Demographic data (population, gender, race, education)
/// - Housing data (units, ownership, vacancy)
/// - Economic indicators (household income, home values)
/// - Commute patterns
///
/// This data is used by the AI to generate realistic, neighborhood-specific
/// simulation results based on actual Atlanta neighborhood characteristics.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NeighborhoodProperties {
    #[serde(rename = "OBJECTID_1")]
    pub objectid_1: i32,
    #[serde(rename = "OBJECTID")]
    pub objectid: Option<i32>,
    #[serde(rename = "LOCALID")]
    pub localid: String,
    #[serde(rename = "NAME")]
    pub name: String,
    #[serde(rename = "GEOTYPE")]
    pub geotype: String,
    #[serde(rename = "FULLFIPS")]
    pub fullfips: String,
    #[serde(rename = "LEGALAREA")]
    pub legalarea: f64,
    #[serde(rename = "EFFECTDATE")]
    pub effectdate: Option<String>,
    #[serde(rename = "ENDDATE")]
    pub enddate: Option<String>,
    #[serde(rename = "SRCREF")]
    pub srcref: String,
    #[serde(rename = "ACRES")]
    pub acres: f64,
    #[serde(rename = "SQMILES")]
    pub sqmiles: f64,
    #[serde(rename = "OLDNAME")]
    pub oldname: String,
    #[serde(rename = "NPU")]
    pub npu: String,
    #[serde(rename = "CREATED_US")]
    pub created_us: String,
    #[serde(rename = "CREATED_DA")]
    pub created_da: Option<String>,
    #[serde(rename = "LAST_EDITE")]
    pub last_edite: String,
    #[serde(rename = "LAST_EDI_1")]
    pub last_edi_1: String,
    #[serde(rename = "GLOBALID")]
    pub globalid: String,
    #[serde(rename = "Shape_Leng")]
    pub shape_leng: f64,
    #[serde(rename = "aggregatio")]
    pub aggregatio: String,
    #[serde(rename = "HasData")]
    pub has_data: i32,
    #[serde(rename = "ORIGINAL_O")]
    pub original_o: i32,
    #[serde(rename = "sourceCoun")]
    pub source_coun: String,
    #[serde(rename = "apportionm")]
    pub apportionm: f64,
    #[serde(rename = "population")]
    pub population: f64,
    #[serde(rename = "populati_1")]
    pub populati_1: i32,
    #[serde(rename = "gender_MED")]
    pub gender_med: f64,
    #[serde(rename = "gender_MAL")]
    pub gender_mal: i32,
    #[serde(rename = "gender_M_1")]
    pub gender_m_1: f64,
    #[serde(rename = "gender_M_2")]
    pub gender_m_2: i32,
    #[serde(rename = "gender_M_3")]
    pub gender_m_3: f64,
    #[serde(rename = "gender_M_4")]
    pub gender_m_4: i32,
    #[serde(rename = "gender_M_5")]
    pub gender_m_5: f64,
    #[serde(rename = "gender_M_6")]
    pub gender_m_6: i32,
    #[serde(rename = "gender_M_7")]
    pub gender_m_7: f64,
    #[serde(rename = "gender_M_8")]
    pub gender_m_8: i32,
    #[serde(rename = "gender_M_9")]
    pub gender_m_9: f64,
    #[serde(rename = "gender__10")]
    pub gender_10: i32,
    #[serde(rename = "gender__11")]
    pub gender_11: f64,
    #[serde(rename = "gender__12")]
    pub gender_12: i32,
    #[serde(rename = "gender__13")]
    pub gender_13: f64,
    #[serde(rename = "gender__14")]
    pub gender_14: i32,
    #[serde(rename = "gender__15")]
    pub gender_15: f64,
    #[serde(rename = "gender__16")]
    pub gender_16: i32,
    #[serde(rename = "gender__17")]
    pub gender_17: f64,
    #[serde(rename = "gender__18")]
    pub gender_18: i32,
    #[serde(rename = "gender__19")]
    pub gender_19: f64,
    #[serde(rename = "gender__20")]
    pub gender_20: i32,
    #[serde(rename = "gender__21")]
    pub gender_21: f64,
    #[serde(rename = "gender__22")]
    pub gender_22: i32,
    #[serde(rename = "gender__23")]
    pub gender_23: f64,
    #[serde(rename = "gender__24")]
    pub gender_24: i32,
    #[serde(rename = "gender__25")]
    pub gender_25: f64,
    #[serde(rename = "gender__26")]
    pub gender_26: i32,
    #[serde(rename = "gender__27")]
    pub gender_27: f64,
    #[serde(rename = "gender_FEM")]
    pub gender_fem: i32,
    #[serde(rename = "gender_F_1")]
    pub gender_f_1: f64,
    #[serde(rename = "gender_F_2")]
    pub gender_f_2: i32,
    #[serde(rename = "gender_F_3")]
    pub gender_f_3: f64,
    #[serde(rename = "gender_F_4")]
    pub gender_f_4: i32,
    #[serde(rename = "gender_F_5")]
    pub gender_f_5: f64,
    #[serde(rename = "gender_F_6")]
    pub gender_f_6: i32,
    #[serde(rename = "gender_F_7")]
    pub gender_f_7: f64,
    #[serde(rename = "gender_F_8")]
    pub gender_f_8: i32,
    #[serde(rename = "gender_F_9")]
    pub gender_f_9: f64,
    #[serde(rename = "gender__28")]
    pub gender_28: i32,
    #[serde(rename = "gender__29")]
    pub gender_29: f64,
    #[serde(rename = "gender__30")]
    pub gender_30: i32,
    #[serde(rename = "gender__31")]
    pub gender_31: f64,
    #[serde(rename = "gender__32")]
    pub gender_32: i32,
    #[serde(rename = "gender__33")]
    pub gender_33: f64,
    #[serde(rename = "gender__34")]
    pub gender_34: i32,
    #[serde(rename = "gender__35")]
    pub gender_35: f64,
    #[serde(rename = "gender__36")]
    pub gender_36: i32,
    #[serde(rename = "gender__37")]
    pub gender_37: f64,
    #[serde(rename = "gender__38")]
    pub gender_38: i32,
    #[serde(rename = "gender__39")]
    pub gender_39: f64,
    #[serde(rename = "gender__40")]
    pub gender_40: i32,
    #[serde(rename = "gender__41")]
    pub gender_41: f64,
    #[serde(rename = "gender__42")]
    pub gender_42: i32,
    #[serde(rename = "gender__43")]
    pub gender_43: f64,
    #[serde(rename = "gender__44")]
    pub gender_44: i32,
    #[serde(rename = "gender__45")]
    pub gender_45: f64,
    #[serde(rename = "householdt")]
    pub householdt: i32,
    #[serde(rename = "OwnerRente")]
    pub owner_rente: i32,
    #[serde(rename = "OwnerRen_1")]
    pub owner_ren_1: f64,
    #[serde(rename = "OwnerRen_2")]
    pub owner_ren_2: i32,
    #[serde(rename = "OwnerRen_3")]
    pub owner_ren_3: f64,
    #[serde(rename = "housinguni")]
    pub housinguni: i32,
    #[serde(rename = "vacant_VAC")]
    pub vacant_vac: i32,
    #[serde(rename = "vacant_V_1")]
    pub vacant_v_1: f64,
    #[serde(rename = "raceandhis")]
    pub raceandhis: i32,
    #[serde(rename = "raceandh_1")]
    pub raceandh_1: f64,
    #[serde(rename = "raceandh_2")]
    pub raceandh_2: i32,
    #[serde(rename = "raceandh_3")]
    pub raceandh_3: f64,
    #[serde(rename = "raceandh_4")]
    pub raceandh_4: i32,
    #[serde(rename = "raceandh_5")]
    pub raceandh_5: f64,
    #[serde(rename = "raceandh_6")]
    pub raceandh_6: i32,
    #[serde(rename = "raceandh_7")]
    pub raceandh_7: f64,
    #[serde(rename = "raceandh_8")]
    pub raceandh_8: i32,
    #[serde(rename = "raceandh_9")]
    pub raceandh_9: f64,
    #[serde(rename = "raceand_10")]
    pub raceand_10: i32,
    #[serde(rename = "raceand_11")]
    pub raceand_11: f64,
    #[serde(rename = "hispanicor")]
    pub hispanicor: i32,
    #[serde(rename = "hispanic_1")]
    pub hispanic_1: f64,
    #[serde(rename = "educationa")]
    pub educationa: f64,
    #[serde(rename = "educatio_1")]
    pub educatio_1: f64,
    #[serde(rename = "educatio_2")]
    pub educatio_2: f64,
    #[serde(rename = "educatio_3")]
    pub educatio_3: f64,
    #[serde(rename = "educatio_4")]
    pub educatio_4: f64,
    #[serde(rename = "educatio_5")]
    pub educatio_5: f64,
    #[serde(rename = "educatio_6")]
    pub educatio_6: f64,
    #[serde(rename = "househol_1")]
    pub househol_1: f64,
    #[serde(rename = "households")]
    pub households: f64,
    #[serde(rename = "householdi")]
    pub householdi: i64,
    #[serde(rename = "homevalue_")]
    pub homevalue: i64,
    #[serde(rename = "F5yearincre")]
    pub f5yearincre: f64,
    #[serde(rename = "unitsinstr")]
    pub unitsinstr: i32,
    #[serde(rename = "unitsins_1")]
    pub unitsins_1: f64,
    #[serde(rename = "unitsins_2")]
    pub unitsins_2: i32,
    #[serde(rename = "unitsins_3")]
    pub unitsins_3: f64,
    #[serde(rename = "unitsins_4")]
    pub unitsins_4: i32,
    #[serde(rename = "unitsins_5")]
    pub unitsins_5: f64,
    #[serde(rename = "unitsins_6")]
    pub unitsins_6: i32,
    #[serde(rename = "unitsins_7")]
    pub unitsins_7: f64,
    #[serde(rename = "unitsins_8")]
    pub unitsins_8: i32,
    #[serde(rename = "unitsins_9")]
    pub unitsins_9: f64,
    #[serde(rename = "unitsin_10")]
    pub unitsin_10: i32,
    #[serde(rename = "unitsin_11")]
    pub unitsin_11: f64,
    #[serde(rename = "unitsin_12")]
    pub unitsin_12: i32,
    #[serde(rename = "unitsin_13")]
    pub unitsin_13: f64,
    #[serde(rename = "unitsin_14")]
    pub unitsin_14: i32,
    #[serde(rename = "unitsin_15")]
    pub unitsin_15: f64,
    #[serde(rename = "commute_AC")]
    pub commute_ac: f64,
    #[serde(rename = "commute__1")]
    pub commute_1: f64,
    #[serde(rename = "commute__2")]
    pub commute_2: f64,
    #[serde(rename = "commute__3")]
    pub commute_3: f64,
    #[serde(rename = "commute__4")]
    pub commute_4: f64,
    #[serde(rename = "commute__5")]
    pub commute_5: f64,
    #[serde(rename = "commute__6")]
    pub commute_6: f64,
    #[serde(rename = "Shape__Area")]
    pub shape_area: f64,
    #[serde(rename = "Shape__Length")]
    pub shape_length: f64,
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
    #[serde(rename = "crimeRate")]
    pub crime_rate: f64,
    #[serde(rename = "crimeRateChange", skip_serializing_if = "Option::is_none")]
    pub crime_rate_change: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EventNotification {
    pub id: String,
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub description: String,
    pub severity: String,
    pub timestamp: i64,
    pub coordinates: Vec<f64>,
}

/// Zone-level metrics for a specific neighborhood, district, or area
///
/// Zones can represent neighborhoods, districts, counties, or buildings.
/// This data shows how policy impacts vary across different areas of the city.
#[derive(Debug, Deserialize, Serialize)]
pub struct ZoneData {
    #[serde(rename = "zoneId")]
    pub zone_id: String,
    #[serde(rename = "zoneName")]
    pub zone_name: String,
    pub population: f64,
    #[serde(rename = "populationChange", skip_serializing_if = "Option::is_none")]
    pub population_change: Option<f64>,
    #[serde(rename = "housingUnits")]
    pub housing_units: f64,
    #[serde(rename = "housingUnitsChange", skip_serializing_if = "Option::is_none")]
    pub housing_units_change: Option<f64>,
    #[serde(rename = "trafficFlow")]
    pub traffic_flow: f64,
    #[serde(rename = "trafficFlowChange", skip_serializing_if = "Option::is_none")]
    pub traffic_flow_change: Option<f64>,
    #[serde(rename = "economicIndex")]
    pub economic_index: f64,
    #[serde(
        rename = "economicIndexChange",
        skip_serializing_if = "Option::is_none"
    )]
    pub economic_index_change: Option<f64>,
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
    #[serde(rename = "crimeRate", skip_serializing_if = "Option::is_none")]
    pub crime_rate: Option<f64>,
    #[serde(rename = "crimeRateChange", skip_serializing_if = "Option::is_none")]
    pub crime_rate_change: Option<f64>,
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
            crime_rate: None,
            crime_rate_change: None,
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
