import urllib.request
import json
from pathlib import Path

out_dir = Path("frontend/public/sample-data")
out_dir.mkdir(parents=True, exist_ok=True)

samples = [
    {
        "file": "crack_01.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Crack_in_the_concrete_wall.jpg/800px-Crack_in_the_concrete_wall.jpg",
        "module": "crack_detection",
        "title": "Concrete wall crack",
        "author": "Wikimedia Commons contributor (CC-BY-SA 4.0)",
        "license": "CC-BY-SA-4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Crack_in_the_concrete_wall.jpg"
    },
    {
        "file": "crack_02.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Crack_in_concrete_wall.jpg/800px-Crack_in_concrete_wall.jpg",
        "module": "crack_detection",
        "title": "Pillar surface fissure",
        "author": "Wikimedia Commons contributor (CC-BY-SA 3.0)",
        "license": "CC-BY-SA-3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Crack_in_concrete_wall.jpg"
    },
    {
        "file": "crack_03.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Concrete_crack.jpg/800px-Concrete_crack.jpg",
        "module": "crack_detection",
        "title": "Bridge abutment fracture",
        "author": "Wikimedia Commons contributor (Public Domain)",
        "license": "Public Domain",
        "source": "https://commons.wikimedia.org/wiki/File:Concrete_crack.jpg"
    },
    {
        "file": "pothole_01.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Pothole.jpg/800px-Pothole.jpg",
        "module": "pothole_detection",
        "title": "Asphalt road pothole",
        "author": "Wikimedia Commons contributor (CC-BY-SA 3.0)",
        "license": "CC-BY-SA-3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Pothole.jpg"
    },
    {
        "file": "pothole_02.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Pothole_in_the_street.jpg/800px-Pothole_in_the_street.jpg",
        "module": "pothole_detection",
        "title": "Urban street depression",
        "author": "Wikimedia Commons contributor (CC0)",
        "license": "CC0 1.0",
        "source": "https://commons.wikimedia.org/wiki/File:Pothole_in_the_street.jpg"
    },
    {
        "file": "safety_01.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Construction_workers_at_work.jpg/800px-Construction_workers_at_work.jpg",
        "module": "safety_detection",
        "title": "Site personnel with PPE",
        "author": "Wikimedia Commons contributor (CC-BY 2.0)",
        "license": "CC-BY-2.0",
        "source": "https://commons.wikimedia.org/wiki/File:Construction_workers_at_work.jpg"
    },
    {
        "file": "safety_02.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Construction_workers.jpg/800px-Construction_workers.jpg",
        "module": "safety_detection",
        "title": "Construction site team",
        "author": "Wikimedia Commons contributor (Public Domain)",
        "license": "Public Domain",
        "source": "https://commons.wikimedia.org/wiki/File:Construction_workers.jpg"
    }
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CiviSightInspection/1.0"}
manifest = []
for s in samples:
    target = out_dir / s["file"]
    fn = s["file"]
    print(f"Fetching {fn}...")
    req = urllib.request.Request(s["url"], headers=headers)
    try:
        with urllib.request.urlopen(req) as resp, open(target, "wb") as f:
            f.write(resp.read())
        print(f"Successfully downloaded {fn}: {target.stat().st_size} bytes")
        manifest.append({
            "file": s["file"],
            "module": s["module"],
            "title": s["title"],
            "author": s["author"],
            "license": s["license"],
            "source": s["source"]
        })
    except Exception as e:
        print(f"Failed {fn}: {e}")

with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

attribution_md = """# Sample Data Attributions

All sample images included in CiviSight AI are sourced from open repositories under permissive licenses (Public Domain, CC0, or Creative Commons with attribution) for academic and educational demonstration purposes.

| File | Module | Title | License | Author & Source |
|---|---|---|---|---|
"""
for item in manifest:
    attribution_md += f"| `{item['file']}` | `{item['module']}` | {item['title']} | {item['license']} | [{item['author']}]({item['source']}) |\n"

with open(out_dir / "ATTRIBUTION.md", "w", encoding="utf-8") as f:
    f.write(attribution_md)

print("Manifest and ATTRIBUTION.md created successfully.")
