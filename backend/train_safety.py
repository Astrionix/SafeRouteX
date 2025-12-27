import csv
import json
import math

# Configuration
INPUT_FILE = 'ml/crime_data.csv'
OUTPUT_FILE = 'ml/safety_model.json'
GRID_PRECISION = 3 # 3 decimal places is approx 110m resolution

def train_model():
    print("🚀 Starting Training Process on Open Source Crime Data...")
    
    grid_scores = {}
    
    try:
        with open(INPUT_FILE, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            count = 0
            for row in reader:
                try:
                    lat = float(row['latitude'])
                    lon = float(row['longitude'])
                    severity = int(row['severity'])
                    
                    # Create a grid key (Simple spatial hashing)
                    grid_key = f"{round(lat, GRID_PRECISION)}_{round(lon, GRID_PRECISION)}"
                    
                    if grid_key in grid_scores:
                        grid_scores[grid_key] += severity
                    else:
                        grid_scores[grid_key] = severity
                    count += 1
                except ValueError:
                    continue
            
            print(f"ℹ️  Processed {count} incident reports.")

        if not grid_scores:
            print("⚠️  No valid data found in CSV.")
            return

        # Normalize Scores (0.0 to 1.0)
        # Higher score in CSV = Higher Risk
        # We want Safety Score: 1.0 (Safe) to 0.0 (Dangerous)
        
        max_risk = max(grid_scores.values()) if grid_scores else 1
        print(f"🔥 Max Risk Score found in a grid cell: {max_risk}")
        
        safety_map = {}
        for key, risk_score in grid_scores.items():
            # Normalize risk: 0 to 1
            normalized_risk = risk_score / max_risk
            
            # Safety Score = 1 - Risk
            # We cap minimum safety at 0.1 to avoid routing deadzones completely if needed
            safety_score = max(0.1, round(1 - normalized_risk, 2))
            
            safety_map[key] = safety_score

        # Save Model
        with open(OUTPUT_FILE, 'w') as jsonfile:
            json.dump(safety_map, jsonfile, indent=4)
            
        print(f"✅ Training Complete. Model saved to {OUTPUT_FILE}")
        print(f"Saved {len(safety_map)} high-risk zones.")

    except FileNotFoundError:
        print(f"❌ Error: {INPUT_FILE} not found. Make sure data is present.")
    except Exception as e:
        print(f"❌ Error during training: {str(e)}")

if __name__ == "__main__":
    train_model()
