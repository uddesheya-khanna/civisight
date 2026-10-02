"""
Quick real-image detection test against the live backend server.
"""
import os
import sys
import json
import requests

BASE = "http://localhost:8000"

# Locate sample images
SEARCH_DIRS = [
    "backend/sample_images",
    "sample_images",
    "frontend/dist/sample-data",
    "frontend/public/sample-data",
]

def find_images():
    found = {}
    for d in SEARCH_DIRS:
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            low = f.lower()
            if low.endswith((".jpg", ".jpeg", ".png")):
                path = os.path.join(d, f)
                if "pothole" in low:
                    found.setdefault("pothole_detection", path)
                elif "crack" in low:
                    found.setdefault("crack_detection", path)
                elif "safety" in low or "helmet" in low or "hard" in low:
                    found.setdefault("safety_detection", path)
    return found

def test_module(module, img_path):
    fname = os.path.basename(img_path)
    with open(img_path, "rb") as fh:
        r = requests.post(
            f"{BASE}/api/analyze",
            files={"image": (fname, fh, "image/jpeg")},
            data={"inspection_type": module},
            timeout=60,
        )
    r.raise_for_status()
    res = r.json()
    total_dets = res["summary"]["total_detections"]
    cond_val = res["condition_indicator"]["value"]
    severity = res["summary"]["overall_severity"]
    print(f"\n[{module}]  image={fname}")
    print(f"  status       = {res['status']}")
    print(f"  detections   = {total_dets}")
    print(f"  condition    = {cond_val}")
    print(f"  severity     = {severity}")
    if total_dets > 0:
        d0 = res["detections"][0]
        print(f"  first det    = {json.dumps(d0, indent=4)}")
    # Test PDF
    r2 = requests.post(f"{BASE}/api/report/{res['analysis_id']}", timeout=30)
    r2.raise_for_status()
    ct = r2.headers.get("content-type", "")
    size = len(r2.content)
    ok_pdf = r2.content[:4] == b"%PDF"
    print(f"  PDF report   = {size} bytes, valid={ok_pdf}, ct={ct}")
    return res

def main():
    imgs = find_images()
    if not imgs:
        print("[ERROR] No sample images found. Place images in backend/sample_images/")
        sys.exit(1)

    print(f"Found images: {imgs}")
    all_ok = True
    for module, img_path in imgs.items():
        try:
            test_module(module, img_path)
        except Exception as exc:
            print(f"[FAIL] {module}: {exc}")
            all_ok = False

    print("\n" + ("=" * 50))
    if all_ok:
        print("ALL DETECTION TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
