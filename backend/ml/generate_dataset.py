import csv
import random
import math

OUTPUT_FILE = 'ml/crime_data.csv'
TOTAL_RECORDS = 15000

# City Centers (Lat, Lon) and "Radius" of crime spread (approx degree)
CITIES = {
    'Bangalore': {'coords': (12.9716, 77.5946), 'spread': 0.05, 'risk_factor': 0.8},
    'Delhi': {'coords': (28.7041, 77.1025), 'spread': 0.08, 'risk_factor': 0.9},
    'Mumbai': {'coords': (19.0760, 72.8777), 'spread': 0.06, 'risk_factor': 0.85},
    'Chennai': {'coords': (13.0827, 80.2707), 'spread': 0.05, 'risk_factor': 0.7},
    'Hyderabad': {'coords': (17.3850, 78.4867), 'spread': 0.06, 'risk_factor': 0.75},
    'Kolkata': {'coords': (22.5726, 88.3639), 'spread': 0.05, 'risk_factor': 0.8},
    'Pune': {'coords': (18.5204, 73.8567), 'spread': 0.04, 'risk_factor': 0.6},
}

CRIME_TYPES = ['Theft', 'Assault', 'Harassment', 'Robbery', 'Vandalism', 'Burglary']

def generate_point(center_lat, center_lon, spread):
    # Generate random point using Gaussian distribution to simulate clusters
    lat = random.gauss(center_lat, spread)
    lon = random.gauss(center_lon, spread)
    return lat, lon

def generate_dataset():
    print(f"🚀 Generating {TOTAL_RECORDS} synthetic crime records for India...")
    
    with open(OUTPUT_FILE, 'w', newline='') as csvfile:
        fieldnames = ['latitude', 'longitude', 'severity', 'type', 'timestamp']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for _ in range(TOTAL_RECORDS):
            # Pick a random city
            city_name = random.choice(list(CITIES.keys()))
            city = CITIES[city_name]
            
            # Generate location
            lat, lon = generate_point(city['coords'][0], city['coords'][1], city['spread'])
            
            # Severity based on weighted random (some cities might be "safer" on avg)
            base_severity = random.randint(1, 10)
            if random.random() < 0.2: # 20% 
                severity = min(10, base_severity + 2) # Hotspot spikes
            else:
                severity = base_severity
                
            crime_type = random.choice(CRIME_TYPES)
            
            # Fake Timestamp
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            hour = random.randint(0, 23)
            timestamp = f"2024-{month:02d}-{day:02d}T{hour:02d}:00:00"
            
            writer.writerow({
                'latitude': f"{lat:.6f}",
                'longitude': f"{lon:.6f}",
                'severity': severity,
                'type': crime_type,
                'timestamp': timestamp
            })
            
    print(f"✅ Generated data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_dataset()
