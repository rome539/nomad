#!/usr/bin/env python3
"""Normalize generated 4x2 sprite sheets for NOMAD production use."""

from array import array
from collections import deque
from pathlib import Path
import sys

from PIL import Image


MAGENTA = (255, 0, 255, 255)
SHEET_SIZE = (2048, 1024)
CELL_SIZE = 512
SAFE_EXTENT = 448
GROUND_MARGIN = 28


def normalize_magenta(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _alpha = pixels[x, y]
            if red >= 200 and blue >= 200 and green <= 90:
                pixels[x, y] = MAGENTA
    return image


def find_components(image: Image.Image):
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    components = []

    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or pixels[x, y] == MAGENTA:
                continue

            queue = deque([start])
            seen[start] = 1
            indices = array("I")
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                index = queue.popleft()
                px = index % width
                py = index // width
                indices.append(index)
                min_x = min(min_x, px)
                max_x = max(max_x, px)
                min_y = min(min_y, py)
                max_y = max(max_y, py)

                for near_y in range(max(0, py - 1), min(height, py + 2)):
                    row = near_y * width
                    for near_x in range(max(0, px - 1), min(width, px + 2)):
                        near = row + near_x
                        if not seen[near] and pixels[near_x, near_y] != MAGENTA:
                            seen[near] = 1
                            queue.append(near)

            if len(indices) > 500:
                components.append(
                    {
                        "indices": indices,
                        "box": (min_x, min_y, max_x + 1, max_y + 1),
                        "center_x": (min_x + max_x + 1) / 2,
                        "center_y": (min_y + max_y + 1) / 2,
                    }
                )

    return components


def build_sheet(source: Path, destination: Path) -> None:
    image = normalize_magenta(Image.open(source))
    components = find_components(image)
    if len(components) != 8:
        raise RuntimeError(f"Expected 8 sprites; found {len(components)}")

    split_y = image.height / 2
    top = sorted(
        (component for component in components if component["center_y"] < split_y),
        key=lambda component: component["center_x"],
    )
    bottom = sorted(
        (component for component in components if component["center_y"] >= split_y),
        key=lambda component: component["center_x"],
    )
    if len(top) != 4 or len(bottom) != 4:
        raise RuntimeError("Sprites do not resolve to a strict 4x2 layout")

    ordered = top + bottom
    max_width = max(component["box"][2] - component["box"][0] for component in ordered)
    max_height = max(component["box"][3] - component["box"][1] for component in ordered)
    scale = min(SAFE_EXTENT / max_width, SAFE_EXTENT / max_height, 1.0)
    result = Image.new("RGBA", SHEET_SIZE, MAGENTA)
    source_pixels = image.load()

    for pose, component in enumerate(ordered):
        min_x, min_y, max_x, max_y = component["box"]
        crop = Image.new("RGBA", (max_x - min_x, max_y - min_y), MAGENTA)
        crop_pixels = crop.load()
        for index in component["indices"]:
            px = index % image.width
            py = index // image.width
            crop_pixels[px - min_x, py - min_y] = source_pixels[px, py]

        target_width = max(1, round(crop.width * scale))
        target_height = max(1, round(crop.height * scale))
        crop = crop.resize((target_width, target_height), Image.Resampling.NEAREST)

        column = pose % 4
        row = pose // 4
        target_x = column * CELL_SIZE + (CELL_SIZE - target_width) // 2
        if pose in (1, 2, 3):
            target_y = row * CELL_SIZE + (CELL_SIZE - target_height) // 2
        else:
            target_y = row * CELL_SIZE + CELL_SIZE - GROUND_MARGIN - target_height
        result.paste(crop, (target_x, target_y))

    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, optimize=False)
    validate(result)


def validate(image: Image.Image) -> None:
    if image.size != SHEET_SIZE:
        raise RuntimeError(f"Unexpected output size: {image.size}")
    if any(alpha != 255 for *_rgb, alpha in image.getdata()):
        raise RuntimeError("Output contains non-opaque pixels")

    pixels = image.load()
    bands = [
        (0, 0, 8, 1024),
        (2040, 0, 2048, 1024),
        (0, 0, 2048, 8),
        (0, 1016, 2048, 1024),
        (496, 0, 528, 1024),
        (1008, 0, 1040, 1024),
        (1520, 0, 1552, 1024),
        (0, 496, 2048, 528),
    ]
    for left, top, right, bottom in bands:
        if any(
            pixels[x, y] != MAGENTA
            for y in range(top, bottom)
            for x in range(left, right)
        ):
            raise RuntimeError("A sprite enters a protected gutter band")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: normalize_sprite_sheet.py SOURCE DESTINATION")
    build_sheet(Path(sys.argv[1]), Path(sys.argv[2]))
