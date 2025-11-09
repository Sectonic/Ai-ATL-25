//! Neighborhood Data Management
//!
//! This module handles loading and searching neighborhood data from the GeoJSON file.
//! The data is loaded once on server startup and kept in memory for fast lookups.

use crate::types::NeighborhoodProperties;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Clone)]
pub struct NeighborhoodDatabase {
    neighborhoods: Arc<HashMap<String, NeighborhoodProperties>>,
}

impl NeighborhoodDatabase {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let geojson_path = std::path::Path::new("backend/data/neighborhoods.geojson");
        let alt_path = std::path::Path::new("data/neighborhoods.geojson");

        let path = if geojson_path.exists() {
            geojson_path
        } else if alt_path.exists() {
            alt_path
        } else {
            return Err("neighborhoods.geojson not found".into());
        };

        let content = std::fs::read_to_string(path)?;
        let geojson: Value = serde_json::from_str(&content)?;

        let mut neighborhoods = HashMap::new();

        if let Some(features) = geojson.get("features").and_then(|f| f.as_array()) {
            for feature in features {
                if let Some(properties) = feature.get("properties") {
                    if let Ok(neighborhood) =
                        serde_json::from_value::<NeighborhoodProperties>(properties.clone())
                    {
                        neighborhoods.insert(neighborhood.name.clone(), neighborhood);
                    }
                }
            }
        }

        Ok(Self {
            neighborhoods: Arc::new(neighborhoods),
        })
    }

    pub fn find_by_name(&self, name: &str) -> Option<NeighborhoodProperties> {
        self.neighborhoods.get(name).cloned()
    }

    #[allow(dead_code)]
    pub fn find_by_names(&self, names: &[String]) -> HashMap<String, NeighborhoodProperties> {
        let mut result = HashMap::new();
        for name in names {
            if let Some(neighborhood) = self.find_by_name(name) {
                result.insert(name.clone(), neighborhood);
            }
        }
        result
    }

    pub fn count(&self) -> usize {
        self.neighborhoods.len()
    }
}

impl Default for NeighborhoodDatabase {
    fn default() -> Self {
        Self::new().unwrap_or_else(|e| {
            eprintln!("⚠️  Warning: Failed to load neighborhoods.geojson: {}", e);
            eprintln!("   Neighborhood lookups will be limited to provided data");
            Self {
                neighborhoods: Arc::new(HashMap::new()),
            }
        })
    }
}
