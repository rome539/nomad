#!/usr/bin/env python3
"""Normalize a generated four-frame NOMAD strip into 768px cells."""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


MAGENTA = (255, 0, 255, 255)
CELL_SIZE = 768
CELL_COUNT = 4
SAFE_EXTENT = 680
GROUND_MARGIN = 42
GUTTER = 24


def flatten_and_key(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    flat = Image.new("RGBA", source.size, MAGENTA)
    flat.alpha_composite(source)
    pixels = flat.load()
    for y in range(flat.height):
        for x in range(flat.width):
            red, green, blue, _alpha = pixels[x, y]
            if red >= 200 and blue >= 200 and green <= 90:
                pixels[x, y] = MAGENTA
    return flat


def content_box(cell: Image.Image):
    pixels = cell.load()
    points = [
        (x, y)
        for y in range(cell.height)
        for x in range(cell.width)
        if pixels[x, y] != MAGENTA
    ]
    if not points:
        raise RuntimeError("Empty pose cell")
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def build(source_path: Path, destination_path: Path) -> None:
    source = flatten_and_key(Image.open(source_path))
    result = Image.new("RGBA", (CELL_SIZE * CELL_COUNT, CELL_SIZE), MAGENTA)
    source_cell_width = source.width / CELL_COUNT
    crops = []

    for index in range(CELL_COUNT):
        left = round(index * source_cell_width)
        right = round((index + 1) * source_cell_width)
        cell = source.crop((left, 0, right, source.height))
        crops.append(cell.crop(content_box(cell)))

    max_width = max(crop.width for crop in crops)
    max_height = max(crop.height for crop in crops)
    scale = min(SAFE_EXTENT / max_width, SAFE_EXTENT / max_height)

    for index, crop in enumerate(crops):
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        resized = crop.resize((width, height), Image.Resampling.NEAREST)
        x = index * CELL_SIZE + (CELL_SIZE - width) // 2
        y = CELL_SIZE - GROUND_MARGIN - height
        result.paste(resized, (x, y))

    validate(result)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination_path, optimize=False)


def validate(image: Image.Image) -> None:
    expected = (CELL_SIZE * CELL_COUNT, CELL_SIZE)
    if image.size != expected:
        raise RuntimeError(f"Unexpected output size: {image.size}")
    if image.getchannel("A").getextrema() != (255, 255):
        raise RuntimeError("Output contains non-opaque pixels")

    pixels = image.load()
    bands = [(0, 0, GUTTER, image.height),
             (image.width - GUTTER, 0, image.width, image.height),
             (0, 0, image.width, GUTTER)]
    for boundary in range(1, CELL_COUNT):
        x = boundary * CELL_SIZE
        bands.append((x - GUTTER, 0, x + GUTTER, image.height))
    for left, top, right, bottom in bands:
        if any(pixels[x, y] != MAGENTA
               for y in range(top, bottom)
               for x in range(left, right)):
            raise RuntimeError("A sprite enters a protected gutter band")


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    build(args.source, args.destination)


if __name__ == "__main__":
    main()
