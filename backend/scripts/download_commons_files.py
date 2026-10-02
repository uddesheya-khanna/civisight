import urllib.request
import urllib.parse
import json
from pathlib import Path
from PIL import Image

out_dir = Path("frontend/public/sample-data")
out_dir.mkdir(parents=True, exist_ok=True)

titles_mapping = [
    # Crack
    ("File:Cracks in concrete - geograph.org.uk - 706423.jpg", "crack_01.jpg", "crack_detection", "Cracks in concrete slab"),
    ("File:Concrete cracked.jpg", "crack_02.jpg", "crack_detection", "Concrete wall surface fracture"),
    ("File:Crack in concrete.jpg", "crack_03.jpg", "crack_detection", "Pavement stress crack"),
    
    # Pothole
    ("File:Pothole on Huntington Creek Road.JPG", "pothole_01.jpg", "pothole_detection", "Asphalt road pothole distress"),
    ("File:Pothole in Villeray, Montréal.jpg", "pothole_02.jpg", "pothole_detection", "Urban street surface breakdown"),
    ("File:Pothole in Thai.jpg", "pothole_03.jpg", "pothole_detection", "Roadway pothole damage"),
    
    # Safety
    ("File:Construction workers in Mexico.jpg", "safety_01.jpg", "safety_detection", "Construction personnel with hard hats"),
    ("File:Construction Workers.jpg", "safety_02.jpg", "safety_detection", "Site team at construction area"),
    ("File:Construction Workers (8583287676).jpg", "safety_03.jpg", "safety_detection", "Workers operating on building structure"),
]

headers = {"User-Agent": "CiviSightBot/1.0 (academic_civil_inspection@university.edu)"}

manifest = []

for wiki_title, local_fn, module_id, custom_title in titles_mapping:
    print(f"Fetching metadata for {wiki_title}...")
    api_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={urllib.parse.quote(wiki_title)}&prop=imageinfo&iiprop=url|extmetadata&format=json"
    req = urllib.request.Request(api_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get("query", {}).get("pages", {})
            for pid, p in pages.items():
                if pid == "-1":
                    print(f"  -> Title not found: {wiki_title}")
                    continue
                ii = p.get("imageinfo", [{}])[0]
                img_url = ii.get("url")
                if not img_url:
                    continue
                
                extmeta = ii.get("extmetadata", {})
                license_name = extmeta.get("LicenseShortName", {}).get("value", "CC / Public Domain")
                artist = extmeta.get("Artist", {}).get("value", "Wikimedia Contributor")
                import re
                artist_clean = re.sub(r'<[^>]+>', '', artist).strip() or "Wikimedia Contributor"
                
                print(f"  -> Downloading {img_url} to {local_fn}...")
                dl_req = urllib.request.Request(img_url, headers=headers)
                target_p = out_dir / local_fn
                with urllib.request.urlopen(dl_req) as dl_resp:
                    with open(target_p, "wb") as f:
                        f.write(dl_resp.read())
                
                # Check dimensions
                with Image.open(target_p) as test_img:
                    w, h = test_img.size
                print(f"  -> Successfully saved {local_fn} ({w}x{h}, {target_p.stat().st_size} bytes)")
                
                manifest.append({
                    "file": local_fn,
                    "module": module_id,
                    "title": custom_title,
                    "author": artist_clean[:60],
                    "license": license_name,
                    "source": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(wiki_title)}"
                })
    except Exception as e:
        print(f"  -> Error for {wiki_title}: {e}")

# Save manifest.json
with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

attribution_md = """# Sample Data Attributions

All sample images included in CiviSight AI demo mode are sourced from Wikimedia Commons under permissive licenses for academic inspection demonstration.

| File | Module | Title | License | Author & Source |
|---|---|---|---|---|
"""
for m in manifest:
    attribution_md += f"| `{m['file']}` | `{m['module']}` | {m['title']} | {m['license']} | [{m['author']}]({m['source']}) |\n"

with open(out_dir / "ATTRIBUTION.md", "w", encoding="utf-8") as f:
    f.write(attribution_md)

print(f"\nFinished! Downloaded {len(manifest)} sample files.")
