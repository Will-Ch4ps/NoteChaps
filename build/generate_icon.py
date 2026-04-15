"""Generate NoteChaps brand icons (.ico + .png variants) with Pillow."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw

DIR = Path(__file__).resolve().parent
SIZES = [16, 24, 32, 48, 64, 128, 256, 512]


def rounded_line(draw: ImageDraw.ImageDraw, p1: tuple[float, float], p2: tuple[float, float], width: int, color: tuple[int, int, int, int]) -> None:
    draw.line([p1, p2], fill=color, width=width)
    radius = width / 2
    for x, y in (p1, p2):
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.06
    radius = size * 0.2

    bg = (31, 35, 48, 255)
    accent = (74, 158, 255, 255)
    accent_soft = (158, 210, 255, 255)

    x0, y0, x1, y1 = pad, pad, size - pad, size - pad
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=bg)

    inset = max(1, int(size * 0.016))
    draw.rounded_rectangle(
        [x0 + inset, y0 + inset, x1 - inset, y1 - inset],
        radius=radius - inset,
        outline=(74, 158, 255, 110),
        width=max(1, size // 70),
    )

    # "N" monogram with note-cut accent.
    left = size * 0.30
    right = size * 0.70
    top = size * 0.30
    bottom = size * 0.70
    stroke = max(2, int(size * 0.1))

    rounded_line(draw, (left, bottom), (left, top), stroke, accent)
    rounded_line(draw, (left, top), (right, bottom), stroke, accent)
    rounded_line(draw, (right, bottom), (right, top), stroke, accent)

    nib_start = (right - size * 0.02, bottom + size * 0.06)
    nib_end = (right + size * 0.10, bottom - size * 0.06)
    rounded_line(draw, nib_start, nib_end, max(1, stroke // 2), accent_soft)

    return img


def save_png_sizes(base: Image.Image, sizes: Iterable[int]) -> None:
    for size in sizes:
        out = base.resize((size, size), Image.Resampling.LANCZOS)
        out.save(DIR / f"icon_{size}x{size}.png", format="PNG")


def main() -> None:
    base = make_icon(512)

    # Main png for package metadata
    base.resize((256, 256), Image.Resampling.LANCZOS).save(DIR / "icon.png", format="PNG")

    # Multi-size ico for Windows installer
    base.save(
        DIR / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    # Explicit png variants (useful for docs/tests and backwards compatibility)
    save_png_sizes(base, SIZES)

    print(f"Generated icon assets in: {DIR}")


if __name__ == "__main__":
    main()
