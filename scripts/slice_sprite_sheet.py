#!/usr/bin/env python3
"""
AIM-Office 2x2 Isometric Sprite Sheet Slicer.

Slices a 2x2 directional character sprite sheet into 4 alpha-transparent PNGs:
  - {slug}-front-left.png   (top-left quadrant)
  - {slug}-front-right.png  (top-right quadrant)
  - {slug}-rear-left.png    (bottom-left quadrant)
  - {slug}-rear-right.png   (bottom-right quadrant)

Usage:
  python3 scripts/slice_sprite_sheet.py <input_image> <archetype_slug> [--output-dir public/sprites/characters]
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from typing import Dict, Tuple

from PIL import Image

DIRECTIONS: Tuple[str, ...] = (
    "front-left",
    "front-right",
    "rear-left",
    "rear-right",
)


def _is_bg_pixel(
    r: int,
    g: int,
    b: int,
    a: int,
    edge_rgb: Tuple[int, int, int],
    tolerance: int = 24,
) -> bool:
    """Return True if a pixel matches transparent, white, magenta, or the corner background color."""
    if a == 0:
        return True
    # Pure/near-white background
    if r >= 245 and g >= 245 and b >= 245:
        return True
    # Chroma magenta key (#FF00FF)
    if r >= 235 and g <= 25 and b >= 235:
        return True
    # Match sampled corner background within tolerance
    er, eg, eb = edge_rgb
    if (
        abs(r - er) <= tolerance
        and abs(g - eg) <= tolerance
        and abs(b - eb) <= tolerance
    ):
        return True
    return False


def remove_background_rgba(img: Image.Image, tolerance: int = 24) -> Image.Image:
    """Remove solid white, magenta, or edge-connected background to RGBA transparency."""
    rgba = img.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    if pixels is None or width == 0 or height == 0:
        return rgba

    # Sample top-left corner pixel as the primary background reference
    tl_r, tl_g, tl_b, _ = pixels[0, 0]
    edge_rgb = (tl_r, tl_g, tl_b)

    visited = [[False] * width for _ in range(height)]
    queue: deque[Tuple[int, int]] = deque()

    # Seed flood-fill from all 4 outer borders of the quadrant/image
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        cx, cy = queue.popleft()
        if cx < 0 or cx >= width or cy < 0 or cy >= height:
            continue
        if visited[cy][cx]:
            continue
        visited[cy][cx] = True

        r, g, b, a = pixels[cx, cy]
        if _is_bg_pixel(r, g, b, a, edge_rgb, tolerance=tolerance):
            pixels[cx, cy] = (0, 0, 0, 0)
            queue.append((cx + 1, cy))
            queue.append((cx - 1, cy))
            queue.append((cx, cy + 1))
            queue.append((cx, cy - 1))

    # Also scrub isolated pure chroma-magenta pixels anywhere in the sprite
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0 and r >= 240 and g <= 15 and b >= 240:
                pixels[x, y] = (0, 0, 0, 0)

    return rgba


def slice_sprite_sheet(
    input_path: str | Path,
    archetype_slug: str,
    output_dir: str | Path = "public/sprites/characters",
    tolerance: int = 24,
) -> Dict[str, Path]:
    """
    Slice a 2x2 sprite sheet into 4 directional RGBA PNG files and return their paths.
    """
    src_path = Path(input_path)
    if not src_path.exists():
        raise FileNotFoundError(f"Sprite sheet not found: {src_path}")

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(src_path).convert("RGBA")
    width, height = sheet.size
    if width < 2 or height < 2:
        raise ValueError(f"Sprite sheet dimensions too small: {width}x{height}")

    mid_x = width // 2
    mid_y = height // 2

    quadrant_boxes: Dict[str, Tuple[int, int, int, int]] = {
        "front-left": (0, 0, mid_x, mid_y),
        "front-right": (mid_x, 0, width, mid_y),
        "rear-left": (0, mid_y, mid_x, height),
        "rear-right": (mid_x, mid_y, width, height),
    }

    written: Dict[str, Path] = {}
    for direction in DIRECTIONS:
        crop_box = quadrant_boxes[direction]
        quadrant = sheet.crop(crop_box)
        cleaned = remove_background_rgba(quadrant, tolerance=tolerance)
        bbox = cleaned.getbbox()
        if bbox is not None:
            cleaned = cleaned.crop(bbox)

        out_file = out_dir / f"{archetype_slug}-{direction}.png"
        cleaned.save(out_file, format="PNG")
        written[direction] = out_file

    return written


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Slice a 2x2 isometric character sprite sheet into 4 directional PNGs."
    )
    parser.add_argument("input_image", help="Path to the input 2x2 sprite sheet PNG/JPG")
    parser.add_argument("archetype_slug", help="Archetype slug (e.g., boss-joshua, vessel-agy)")
    parser.add_argument(
        "--output-dir",
        "-o",
        default="public/sprites/characters",
        help="Destination folder for sliced sprites (default: public/sprites/characters)",
    )
    parser.add_argument(
        "--tolerance",
        type=int,
        default=24,
        help="Background color tolerance (default: 24)",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    outputs = slice_sprite_sheet(
        input_path=args.input_image,
        archetype_slug=args.archetype_slug,
        output_dir=args.output_dir,
        tolerance=args.tolerance,
    )
    for direction, path in outputs.items():
        with Image.open(path) as saved:
            w, h = saved.size
        print(f"[OK] {direction}: {path} ({w}x{h})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
