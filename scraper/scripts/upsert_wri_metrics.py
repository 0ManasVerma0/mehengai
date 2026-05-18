from pathlib import Path
import sys
import pandas as pd

# Ensure project root is first on sys.path so local 'db' package is used
project_root = Path(__file__).resolve().parents[2]
scraper_dir = project_root / 'scraper'
sys.path.insert(0, str(scraper_dir))

from db.load_data import load_wri

csv_path = scraper_dir / 'cleaned_data' / 'wri_metrics.csv'
print('Upserting', csv_path)
df = pd.read_csv(csv_path)
res = load_wri(df)
print('Result:', res)
