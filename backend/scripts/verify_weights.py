import urllib.request
from pathlib import Path
from ultralytics import YOLO

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# 1. Candidate Pothole model
pothole_dest = MODELS_DIR / "pothole_yolo.pt"
pothole_url = "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt"

print("Downloading candidate pothole model...")
try:
    urllib.request.urlretrieve(pothole_url, pothole_dest)
    print("Pothole model downloaded. Checking classes...")
    m = YOLO(str(pothole_dest))
    print(f"Pothole model names: {m.names}")
except Exception as e:
    print(f"Error with pothole model: {e}")

# 2. Candidate Helmet model
helmet_dest = MODELS_DIR / "helmet_yolo.pt"
helmet_url = "https://huggingface.co/keremberke/yolov8n-hard-hat-detection/resolve/main/best.pt"

print("\nDownloading candidate helmet model...")
try:
    urllib.request.urlretrieve(helmet_url, helmet_dest)
    print("Helmet model downloaded. Checking classes...")
    m2 = YOLO(str(helmet_dest))
    print(f"Helmet model names: {m2.names}")
except Exception as e:
    print(f"Error with helmet model: {e}")
