"""
Downloads COCO yolov8n.pt model to backend/models/yolov8n.pt
and prints guidance for acquiring crack, pothole, and helmet weights.
"""
from pathlib import Path
import sys
import shutil

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target_coco = MODELS_DIR / "yolov8n.pt"

    print("=======================================================")
    print(" CiviSight AI — Model Setup & Acquisition Tool")
    print("=======================================================")

    # 1. Fetch COCO yolov8n.pt for safety module (person detector)
    if not target_coco.exists():
        print(f"\nDownloading COCO yolov8n.pt to {target_coco}...")
        try:
            from ultralytics import YOLO
            # Ultralytics will auto-download yolov8n.pt to current directory if not present
            m = YOLO("yolov8n.pt")
            # If downloaded in current dir or root, copy/move to models/
            src = Path("yolov8n.pt")
            if src.exists() and src.resolve() != target_coco.resolve():
                shutil.copy(src, target_coco)
            print("Successfully acquired COCO yolov8n.pt.")
        except Exception as e:
            print(f"Error fetching yolov8n.pt via Ultralytics: {e}")
            print("Attempting direct urllib download...")
            import urllib.request
            url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
            urllib.request.urlretrieve(url, target_coco)
            print("Direct download completed.")
    else:
        print(f"COCO yolov8n.pt already present at {target_coco}.")

    # 2. Guidance for other weights
    print("\n-------------------------------------------------------")
    print(" Status of Specialized Weights:")
    print("-------------------------------------------------------")

    crack_p = MODELS_DIR / "crack_yolo.pt"
    if crack_p.exists():
        print(f"[OK] Crack YOLO model found: {crack_p}")
    else:
        print(f"[NOTE] Crack YOLO model not present at {crack_p}.")
        print("       --> Classical OpenCV Sato ridge baseline is active and ready.")

    pothole_p = MODELS_DIR / "pothole_yolo.pt"
    if pothole_p.exists():
        print(f"[OK] Pothole YOLO model found: {pothole_p}")
    else:
        print(f"[MISSING] Pothole YOLO model not present at {pothole_p}.")
        print("          Module will return MODEL_UNAVAILABLE until trained weights are added.")

    helmet_p = MODELS_DIR / "helmet_yolo.pt"
    if helmet_p.exists():
        print(f"[OK] Helmet YOLO model found: {helmet_p}")
    else:
        print(f"[NOTE] Helmet YOLO model not present at {helmet_p}.")
        print("       Safety module will run in person-only degraded mode.")

    print("\n-------------------------------------------------------")
    print(" How to train/install custom weights (PRD Section 9.4):")
    print("-------------------------------------------------------")
    print("  1. Crack: Train yolov8n-seg.pt or yolov8n.pt on Roboflow/DeepCrack dataset:")
    print("     yolo segment train data=datasets/crack/data.yaml model=yolov8n-seg.pt epochs=50 imgsz=640")
    print("     copy runs/segment/train/weights/best.pt backend/models/crack_yolo.pt")
    print("  2. Pothole: Train yolov8n.pt on RDD2022/Roboflow pothole dataset:")
    print("     yolo detect train data=datasets/pothole/data.yaml model=yolov8n.pt epochs=50 imgsz=640")
    print("     copy runs/detect/train/weights/best.pt backend/models/pothole_yolo.pt")
    print("  3. Helmet: Train yolov8n.pt on SH17/Hard Hat dataset:")
    print("     yolo detect train data=datasets/helmet/data.yaml model=yolov8n.pt epochs=50 imgsz=960")
    print("     copy runs/detect/train/weights/best.pt backend/models/helmet_yolo.pt")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
