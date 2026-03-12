"""
Image processing pipeline for The Blue Samurai landing page.
Generates responsive WebP/JPG variants, LQIP base64 placeholders, OG image, and favicon.

Usage:
    python process_images.py

Requires: Pillow (pip install Pillow)
"""

import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageOps

# === Configuration ===

SOURCE_BASE = Path(r"C:\Users\mdzho\Downloads\SORENTO 4 (2020-2025)\Kia Sorento SX (Sapphire Blue)")
OUTPUT_BASE = Path(__file__).resolve().parent.parent / "img"

HERO_WIDTHS = [640, 960, 1280, 1920]
GALLERY_WIDTHS = [400, 800, 1280]

WEBP_QUALITY = 80
WEBP_METHOD = 6
JPG_QUALITY = 82
LQIP_WIDTH = 20
LQIP_QUALITY = 20

IMAGES = [
    # (name, relative_source_path, section, is_hero)
    ("hero",           "2025.12/DSC_0603.jpg", "hero",    True),
    ("side_profile",   "2025.12/DSC_0604.jpg", "gallery", False),
    ("rear_quarter",   "2025.12/DSC_0593.jpg", "gallery", False),
    ("rear_straight",  "2025.12/DSC_0596.jpg", "gallery", False),
    ("front_samurai",  "2025.12/DSC_0600.jpg", "gallery", False),
    ("wheel_detail",   "2025.12/DSC_0638.jpg", "gallery", False),
    ("engine_bay",     "2025.12/DSC_0617.jpg", "gallery", False),
    ("dashboard",      "2025.12/DSC_0609.jpg", "gallery", False),
    ("steering",       "2025.12/DSC_0608.jpg", "gallery", False),
    ("infotainment",   "2025.12/DSC_0607.jpg", "gallery", False),
    ("sunroof",        "2025.12/DSC_0610.jpg", "gallery", False),
    ("door_ambient",   "2025.12/DSC_0611.JPG", "gallery", False),
    ("forest_front",   "2025.12/DSC_0644.jpg", "gallery", False),
    ("forest_rear",    "2025.12/DSC_0646.jpg", "gallery", False),
    ("forest_peek",    "2025.12/DSC_0642.jpg", "gallery", False),
    ("mood_urban",     "2025.11/1.png",        "gallery", False),
]


def ensure_rgb(img, source_path):
    """Convert RGBA/P to RGB. For PNGs with alpha, composite onto white."""
    if img.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        return background
    if img.mode == "P":
        return img.convert("RGB")
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def process_image(name, source_path, section, is_hero):
    """Process a single image: generate responsive variants + LQIP."""
    print(f"  Processing: {name} ({source_path.name})")

    img = Image.open(source_path)

    # Auto-orient JPEGs using EXIF data
    if source_path.suffix.lower() in (".jpg", ".jpeg"):
        img = ImageOps.exif_transpose(img)

    img = ensure_rgb(img, source_path)

    orig_w, orig_h = img.size
    aspect = orig_h / orig_w

    widths = HERO_WIDTHS if is_hero else GALLERY_WIDTHS
    out_dir = OUTPUT_BASE / section

    results = {"name": name, "variants": [], "lqip": None}

    for w in widths:
        if w > orig_w:
            w = orig_w  # Don't upscale

        h = round(w * aspect)
        resized = img.resize((w, h), Image.LANCZOS)

        # WebP variant
        webp_path = out_dir / f"{name}_{w}w.webp"
        resized.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        webp_size = webp_path.stat().st_size

        results["variants"].append({
            "width": w,
            "height": h,
            "webp": str(webp_path.relative_to(OUTPUT_BASE.parent)),
            "size_kb": round(webp_size / 1024, 1),
        })

        print(f"    {w}w WebP: {round(webp_size / 1024)}KB")

    # JPG fallback at largest width
    largest_w = widths[-1] if widths[-1] <= orig_w else orig_w
    largest_h = round(largest_w * aspect)
    largest = img.resize((largest_w, largest_h), Image.LANCZOS)
    jpg_path = out_dir / f"{name}_{largest_w}w.jpg"
    largest.save(jpg_path, "JPEG", quality=JPG_QUALITY, optimize=True)
    jpg_size = jpg_path.stat().st_size
    results["jpg_fallback"] = str(jpg_path.relative_to(OUTPUT_BASE.parent))
    print(f"    JPG fallback: {round(jpg_size / 1024)}KB")

    # LQIP (Low Quality Image Placeholder)
    lqip_h = round(LQIP_WIDTH * aspect)
    lqip = img.resize((LQIP_WIDTH, lqip_h), Image.LANCZOS)
    buf = io.BytesIO()
    lqip.save(buf, "WEBP", quality=LQIP_QUALITY)
    lqip_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    results["lqip"] = f"data:image/webp;base64,{lqip_b64}"
    print(f"    LQIP: {len(lqip_b64)} chars base64")

    return results


def generate_og_image(source_path):
    """Generate 1200x630 OG image from hero, center-cropped."""
    print("  Generating OG image...")
    img = Image.open(source_path)
    if source_path.suffix.lower() in (".jpg", ".jpeg"):
        img = ImageOps.exif_transpose(img)
    img = ensure_rgb(img, source_path)

    # Center crop to 1200x630 aspect ratio (1.905:1)
    target_aspect = 1200 / 630
    orig_w, orig_h = img.size
    orig_aspect = orig_w / orig_h

    if orig_aspect > target_aspect:
        # Image is wider - crop sides
        new_w = round(orig_h * target_aspect)
        left = (orig_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, orig_h))
    else:
        # Image is taller - crop top/bottom
        new_h = round(orig_w / target_aspect)
        top = (orig_h - new_h) // 2
        img = img.crop((0, top, orig_w, top + new_h))

    img = img.resize((1200, 630), Image.LANCZOS)
    og_path = OUTPUT_BASE / "og-image.jpg"
    img.save(og_path, "JPEG", quality=85, optimize=True)
    print(f"    OG image: {round(og_path.stat().st_size / 1024)}KB")


def generate_favicon(source_path):
    """Generate favicon from hero image - center crop to square."""
    print("  Generating favicon...")
    img = Image.open(source_path)
    if source_path.suffix.lower() in (".jpg", ".jpeg"):
        img = ImageOps.exif_transpose(img)
    img = ensure_rgb(img, source_path)

    # Center crop to square
    orig_w, orig_h = img.size
    size = min(orig_w, orig_h)
    left = (orig_w - size) // 2
    top = (orig_h - size) // 2
    img = img.crop((left, top, left + size, top + size))

    # Generate multiple sizes
    favicon_dir = OUTPUT_BASE / "favicon"
    for s in [256, 192, 180, 32, 16]:
        resized = img.resize((s, s), Image.LANCZOS)
        if s == 180:
            resized.save(favicon_dir / "apple-touch-icon.png", "PNG")
        elif s == 32:
            resized.save(favicon_dir / "favicon-32x32.png", "PNG")
        elif s == 16:
            resized.save(favicon_dir / "favicon-16x16.png", "PNG")
        elif s == 192:
            resized.save(favicon_dir / "android-chrome-192x192.png", "PNG")
        elif s == 256:
            resized.save(favicon_dir / "android-chrome-256x256.png", "PNG")
        print(f"    favicon {s}x{s}")

    # Generate .ico from 16 and 32
    img16 = img.resize((16, 16), Image.LANCZOS)
    img32 = img.resize((32, 32), Image.LANCZOS)
    img32.save(favicon_dir / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
    print("    favicon.ico")


def main():
    print("=== The Blue Samurai - Image Pipeline ===\n")

    # Ensure output dirs exist
    (OUTPUT_BASE / "hero").mkdir(parents=True, exist_ok=True)
    (OUTPUT_BASE / "gallery").mkdir(parents=True, exist_ok=True)
    (OUTPUT_BASE / "favicon").mkdir(parents=True, exist_ok=True)

    all_results = []

    for name, rel_path, section, is_hero in IMAGES:
        source = SOURCE_BASE / rel_path
        if not source.exists():
            print(f"  WARNING: Source not found: {source}")
            continue
        result = process_image(name, source, section, is_hero)
        all_results.append(result)

    # OG image from hero
    hero_source = SOURCE_BASE / "2025.12/DSC_0603.jpg"
    if hero_source.exists():
        generate_og_image(hero_source)

    # Favicon from hero
    if hero_source.exists():
        generate_favicon(hero_source)

    # Write manifest with LQIP data for embedding in HTML
    manifest_path = OUTPUT_BASE / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n  Manifest written to {manifest_path}")

    print("\n=== Done! ===")


if __name__ == "__main__":
    main()
