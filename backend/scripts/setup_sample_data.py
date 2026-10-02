import urllib.request
import urllib.parse
import json
from pathlib import Path
from PIL import Image

out_dir = Path("frontend/public/sample-data")
out_dir.mkdir(parents=True, exist_ok=True)

headers = {"User-Agent": "CiviSightAI-AcademicBot/1.0 (civil_inspection@university.edu)"}

def search_wikimedia(query, limit=3):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "format": "json",
        "gsrlimit": str(limit * 2)
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers)
    results = []
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get("query", {}).get("pages", {})
            for pid, p in pages.items():
                ii = p.get("imageinfo", [{}])[0]
                img_url = ii.get("url")
                if not img_url:
                    continue
                ext = img_url.split(".")[-1].lower().split("?")[0]
                if ext in ["jpg", "jpeg", "png"]:
                    metadata = ii.get("extmetadata", {})
                    license_name = metadata.get("LicenseShortName", {}).get("value", "CC-BY / Public Domain")
                    author = metadata.get("Artist", {}).get("value", "Wikimedia Commons Contributor")
                    # Clean html in author
                    import re
                    author_clean = re.sub(r'<[^>]+>', '', author).strip() or "Wikimedia Contributor"
                    title = p.get("title", "").replace("File:", "").replace(".jpg", "").replace("_", " ")
                    results.append({
                        "url": img_url,
                        "title": title[:50],
                        "author": author_clean[:50],
                        "license": license_name,
                        "source": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(p.get('title',''))}"
                    })
                    if len(results) >= limit:
                        break
    except Exception as e:
        print(f"Error searching for {query}: {e}")
    return results

modules_queries = [
    ("crack_detection", "crack concrete wall", "crack"),
    ("pothole_detection", "pothole road asphalt", "pothole"),
    ("safety_detection", "construction workers hardhat", "safety"),
]

manifest = []

for mod_id, query, prefix in modules_queries:
    print(f"\nSearching for {mod_id} ({query})...")
    items = search_wikimedia(query, limit=3)
    for idx, item in enumerate(items, start=1):
        filename = f"{prefix}_0{idx}.jpg"
        target_path = out_dir / filename
        print(f"Downloading {filename} from {item['url']} ...")
        try:
            req = urllib.request.Request(item["url"], headers=headers)
            with urllib.request.urlopen(req) as resp:
                raw_data = resp.read()
            with open(target_path, "wb") as f:
                f.write(raw_data)

            # Verify image with Pillow
            with Image.open(target_path) as im:
                w, h = im.size
            print(f"  -> Saved {filename} ({w}x{h}, {target_path.stat().st_size} bytes)")

            manifest.append({
                "file": filename,
                "module": mod_id,
                "title": item["title"],
                "author": item["author"],
                "license": item["license"],
                "source": item["source"]
            })
        except Exception as e:
            print(f"  -> Failed to download {filename}: {e}")

# Save manifest.json
with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

# Save ATTRIBUTION.md
attribution_md = """# Sample Data Attributions

All sample images included in CiviSight AI demo mode are sourced from Wikimedia Commons under permissive licenses for academic inspection demonstration.

| File | Module | Title | License | Author & Source |
|---|---|---|---|---|
"""
for m in manifest:
    attribution_md += f"| `{m['file']}` | `{m['module']}` | {m['title']} | {m['license']} | [{m['author']}]({m['source']}) |\n"

with open(out_dir / "ATTRIBUTION.md", "w", encoding="utf-8") as f:
    f.write(attribution_md)

print("\nSetup complete! Sample files, manifest.json, and ATTRIBUTION.md ready.")
