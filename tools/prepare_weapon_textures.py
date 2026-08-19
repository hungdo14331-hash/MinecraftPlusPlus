"""Normalize generated weapon artwork into crisp 32x32 Bedrock item textures."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def prepare(source: Path, destination: Path, canvas_size: int = 32, margin: int = 2) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    alpha = alpha.point(lambda value: 255 if value >= 48 else 0)
    image.putalpha(alpha)

    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"Texture has no visible pixels: {source}")

    image = image.crop(bounds)
    target_extent = canvas_size - margin * 2
    scale = min(target_extent / image.width, target_extent / image.height)
    target_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    image = image.resize(target_size, Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - image.width) // 2, (canvas_size - image.height) // 2)
    canvas.alpha_composite(image, offset)
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.destination)


if __name__ == "__main__":
    main()
