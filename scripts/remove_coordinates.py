import json
import sys
import os

# Get file path from command line argument or use default
if len(sys.argv) > 1:
    file_path = sys.argv[1]
else:
    default_path = "data/Raw_Demographic_Data.geojson"
    if os.path.exists(default_path):
        file_path = default_path
        print(f"Using default file: {file_path}")
    else:
        print("Error: Please provide a GeoJSON file path")
        print(f"Usage: python {sys.argv[0]} data/Raw_Demographic_Data.geojson")
        sys.exit(1)

# Check if file exists
if not os.path.exists(file_path):
    print(f"Error: File not found: {file_path}")
    sys.exit(1)

# Load the GeoJSON file
print(f"Loading GeoJSON file: {file_path}")
with open(file_path, 'r') as f:
    data = json.load(f)

# Remove coordinates from all features
features = data.get('features', [])
features_processed = 0

for feature in features:
    if 'geometry' in feature:
        # Set geometry to null (removes coordinates but keeps geometry structure)
        feature['geometry'] = None
        features_processed += 1

data['features'] = features

# Save the modified data to a new GeoJSON file
input_dir = os.path.dirname(file_path) or '.'
output_file_path = os.path.join(input_dir, 'Cleaned_Demographics_Data.geojson')

print(f"Removing coordinates from {features_processed} features...")
with open(output_file_path, 'w') as f:
    json.dump(data, f)

print(f"GeoJSON without coordinates saved to: {output_file_path}")
sys.exit(0)
