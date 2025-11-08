import json
def load_geojson(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)
    return geojson_data


data = load_geojson(r"C:\Users\lugis\Downloads\Tax_Parcels_2025.geojson")
print(data)

def sort_by_zipcode(data1):
    for i in  data1