"""
End-to-End smoke test against running CiviSight AI server.
PRD Section 23
"""
import sys
import time
import httpx
from pathlib import Path


def main():
    base_url = "http://localhost:8000"
    if len(sys.argv) > 1:
        base_url = sys.argv[1].rstrip("/")

    print(f"=== Running CiviSight AI End-to-End Smoke Test against {base_url} ===")

    client = httpx.Client(base_url=base_url, timeout=30.0)

    # 1. Health check
    print("\n1. Testing GET /api/health ...")
    t0 = time.perf_counter()
    r = client.get("/api/health")
    dt = (time.perf_counter() - t0) * 1000
    if r.status_code != 200:
        print(f"FAILED: /api/health returned HTTP {r.status_code}: {r.text}")
        sys.exit(1)
    health = r.json()
    print(f"[OK] Health check passed in {dt:.1f}ms: status={health.get('status')}, device={health.get('device')}")
    modules = health.get("modules", {})
    for mod_name, mod_info in modules.items():
        print(f"     - {mod_name}: available={mod_info.get('available')}, mode={mod_info.get('mode')}")

    # 2. Test images
    # Check sample images from frontend/public/sample-data or generate synthetic test image
    sample_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "sample-data"
    test_image_path = None
    if sample_dir.exists():
        candidates = list(sample_dir.glob("*.jpg")) + list(sample_dir.glob("*.png"))
        if candidates:
            test_image_path = candidates[0]

    if not test_image_path or not test_image_path.exists():
        # Generate temporary test JPEG image
        from PIL import Image, ImageDraw
        tmp_img = Image.new("RGB", (640, 480), color=(200, 200, 200))
        draw = ImageDraw.Draw(tmp_img)
        draw.line([(50, 100), (300, 250), (500, 400)], fill=(30, 30, 30), width=4)
        tmp_path = Path("temp_smoke_test.jpg")
        tmp_img.save(tmp_path, "JPEG")
        test_image_path = tmp_path

    print(f"\n2. Using test image: {test_image_path.name}")
    with open(test_image_path, "rb") as f:
        img_bytes = f.read()

    # 3. Analyze available modules
    for mod_name, mod_info in modules.items():
        if not mod_info.get("available"):
            print(f"\nSkipping {mod_name} (module not available on server).")
            continue

        print(f"\n3. Testing POST /api/analyze for {mod_name} ...")
        t0 = time.perf_counter()
        files = {"image": (test_image_path.name, img_bytes, "image/jpeg")}
        data = {"inspection_type": mod_name}
        r = client.post("/api/analyze", files=files, data=data)
        dt = (time.perf_counter() - t0) * 1000

        if r.status_code != 200:
            print(f"FAILED: /api/analyze for {mod_name} returned HTTP {r.status_code}: {r.text}")
            sys.exit(1)

        result = r.json()
        analysis_id = result.get("analysis_id")
        status_str = result.get("status")
        num_dets = len(result.get("detections", []))
        cond_val = result.get("condition_indicator", {}).get("value")
        print(f"[OK] Analysis complete in {dt:.1f}ms: id={analysis_id}, status={status_str}, detections={num_dets}, condition={cond_val}")

        # Verify image URLs
        orig_url = result.get("image", {}).get("original_url")
        annot_url = result.get("image", {}).get("annotated_url")
        assert orig_url and annot_url, "Missing image URLs in result"

        r_orig = client.get(orig_url)
        assert r_orig.status_code == 200, f"Failed to fetch original image: {orig_url}"
        r_annot = client.get(annot_url)
        assert r_annot.status_code == 200, f"Failed to fetch annotated image: {annot_url}"
        print(f"[OK] Image retrieval verified: original ({len(r_orig.content)}B), annotated ({len(r_annot.content)}B)")

        # 4. Generate report PDF
        print(f"4. Testing POST /api/report/{analysis_id} ...")
        t0 = time.perf_counter()
        r_pdf = client.post(f"/api/report/{analysis_id}")
        dt = (time.perf_counter() - t0) * 1000
        if r_pdf.status_code != 200:
            print(f"FAILED: /api/report returned HTTP {r_pdf.status_code}: {r_pdf.text}")
            sys.exit(1)

        pdf_bytes = r_pdf.content
        assert pdf_bytes.startswith(b"%PDF"), f"Report does not start with %PDF header (got {pdf_bytes[:10]})"
        assert len(pdf_bytes) > 10 * 1024, f"Report PDF too small ({len(pdf_bytes)} bytes <= 10KB)"
        print(f"[OK] PDF Report generated in {dt:.1f}ms: size={len(pdf_bytes)} bytes, starts with %PDF")

    # Clean up temp image if created
    if test_image_path.name == "temp_smoke_test.jpg" and test_image_path.exists():
        test_image_path.unlink()

    print("\n=======================================================")
    print(" ALL END-TO-END SMOKE TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
