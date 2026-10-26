"""Unit tests for scripts/slice_sprite_sheet.py."""

from pathlib import Path
from PIL import Image, ImageDraw

from scripts.slice_sprite_sheet import DIRECTIONS, slice_sprite_sheet


def _create_synthetic_2x2_sheet(path: Path, bg_color=(255, 255, 255, 255)) -> Path:
    """Create a 120x120 synthetic 2x2 sprite sheet with distinct colored blocks in each quadrant."""
    img = Image.new("RGBA", (120, 120), bg_color)
    draw = ImageDraw.Draw(img)

    # Top-left (front-left): 20x24 cyan character block at (15, 10) -> (34, 33)
    draw.rectangle([15, 10, 34, 33], fill=(0, 210, 255, 255))
    # Top-right (front-right): 18x26 crimson character block at (75, 12) -> (92, 37)
    draw.rectangle([75, 12, 92, 37], fill=(220, 40, 60, 255))
    # Bottom-left (rear-left): 22x28 emerald character block at (12, 70) -> (33, 97)
    draw.rectangle([12, 70, 33, 97], fill=(20, 200, 120, 255))
    # Bottom-right (rear-right): 16x20 gold character block at (80, 75) -> (95, 94)
    draw.rectangle([80, 75, 95, 94], fill=(245, 180, 30, 255))

    img.save(path, format="PNG")
    return path


def test_slice_2x2_white_background_and_autocrop(tmp_path: Path) -> None:
    sheet_path = _create_synthetic_2x2_sheet(tmp_path / "synthetic_sheet.png")
    out_dir = tmp_path / "out"

    outputs = slice_sprite_sheet(sheet_path, "vessel-agy", output_dir=out_dir)

    assert set(outputs.keys()) == set(DIRECTIONS)
    for direction in DIRECTIONS:
        expected_file = out_dir / f"vessel-agy-{direction}.png"
        assert outputs[direction] == expected_file
        assert expected_file.exists()

    with Image.open(outputs["front-left"]) as fl:
        assert fl.mode == "RGBA"
        assert fl.size == (20, 24)
        assert fl.getpixel((0, 0)) == (0, 210, 255, 255)

    with Image.open(outputs["front-right"]) as fr:
        assert fr.size == (18, 26)
        assert fr.getpixel((0, 0)) == (220, 40, 60, 255)

    with Image.open(outputs["rear-left"]) as rl:
        assert rl.size == (22, 28)
        assert rl.getpixel((0, 0)) == (20, 200, 120, 255)

    with Image.open(outputs["rear-right"]) as rr:
        assert rr.size == (16, 20)
        assert rr.getpixel((0, 0)) == (245, 180, 30, 255)


def test_slice_2x2_magenta_key_transparency(tmp_path: Path) -> None:
    sheet_path = _create_synthetic_2x2_sheet(
        tmp_path / "magenta_sheet.png", bg_color=(255, 0, 255, 255)
    )
    out_dir = tmp_path / "out_magenta"

    outputs = slice_sprite_sheet(sheet_path, "boss-joshua", output_dir=out_dir)

    for direction, out_file in outputs.items():
        assert out_file.name == f"boss-joshua-{direction}.png"
        with Image.open(out_file) as sprite:
            assert sprite.mode == "RGBA"
            # Verify no magenta pixels remain
            for pixel in sprite.getdata():
                assert pixel != (255, 0, 255, 255)
