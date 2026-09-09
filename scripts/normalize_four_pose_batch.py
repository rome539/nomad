#!/usr/bin/env python3
"""Convert a generated 2x2 four-pose canvas into a validated 4x1 NOMAD strip."""

from collections import deque
from pathlib import Path
import sys

from PIL import Image, ImageFilter


SOURCE_COLS = 2
SOURCE_ROWS = 2
TARGET_CELL = 768
TARGET_INNER = 624
TARGET_GUTTER = (TARGET_CELL - TARGET_INNER) // 2
MAGENTA = (255, 0, 255, 255)


def is_background(rgb):
    red, green, blue = rgb
    return min(red, blue) > 150 and min(red, blue) - green > 80


def isolate_largest_sprite(cell: Image.Image) -> Image.Image:
    cell = cell.convert("RGB")
    width, height = cell.size
    source = cell.load()
    foreground = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            foreground[y * width + x] = 0 if is_background(source[x, y]) else 1

    seen = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or not foreground[index]:
                continue
            queue = deque([(x, y)])
            seen[index] = 1
            component = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    neighbour = ny * width + nx
                    if seen[neighbour] or not foreground[neighbour]:
                        continue
                    seen[neighbour] = 1
                    queue.append((nx, ny))
            components.append(component)

    if not components:
        raise ValueError("source cell contains no sprite")
    largest = max(components, key=len)
    mask = Image.new("L", cell.size, 0)
    mask_pixels = mask.load()
    for x, y in largest:
        mask_pixels[x, y] = 255
    mask = mask.filter(ImageFilter.MaxFilter(3))

    sprite = cell.convert("RGBA")
    sprite.putalpha(mask)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("sprite isolation produced an empty mask")
    return sprite.crop(bbox)


def exact_nonmagenta_bbox(cell: Image.Image):
    pixels = cell.load()
    points = [
        (x, y)
        for y in range(cell.height)
        for x in range(cell.width)
        if pixels[x, y] != MAGENTA
    ]
    if not points:
        return None
    return (
        min(x for x, _ in points),
        min(y for _, y in points),
        max(x for x, _ in points) + 1,
        max(y for _, y in points) + 1,
    )


def main() -> int:
    if len(sys.argv) not in (3, 5):
        raise SystemExit(
            "usage: normalize_four_pose_batch.py INPUT.png OUTPUT.png "
            "[--center-poses 1,2]"
        )
    centered = set()
    if len(sys.argv) == 5:
        if sys.argv[3] != "--center-poses":
            raise SystemExit("optional argument must be --center-poses")
        centered = {int(value) for value in sys.argv[4].split(",") if value}
        if not centered.issubset({1, 2, 3, 4}):
            raise ValueError("centered pose numbers must be between 1 and 4")

    source = Image.open(sys.argv[1]).convert("RGB")
    if source.width % SOURCE_COLS or source.height % SOURCE_ROWS:
        raise ValueError(f"source dimensions {source.size} do not divide into 2x2")
    source_cell_w = source.width // SOURCE_COLS
    source_cell_h = source.height // SOURCE_ROWS

    sprites = []
    for row in range(SOURCE_ROWS):
        for col in range(SOURCE_COLS):
            crop = source.crop(
                (
                    col * source_cell_w,
                    row * source_cell_h,
                    (col + 1) * source_cell_w,
                    (row + 1) * source_cell_h,
                )
            )
            sprites.append(isolate_largest_sprite(crop))

    max_width = max(sprite.width for sprite in sprites)
    max_height = max(sprite.height for sprite in sprites)
    common_scale = min(TARGET_INNER / max_width, TARGET_INNER / max_height)

    sheet = Image.new("RGBA", (TARGET_CELL * 4, TARGET_CELL), MAGENTA)
    for index, sprite in enumerate(sprites, start=1):
        size = (
            max(1, round(sprite.width * common_scale)),
            max(1, round(sprite.height * common_scale)),
        )
        sprite = sprite.resize(size, Image.Resampling.LANCZOS)
        x = (TARGET_CELL - sprite.width) // 2
        if index in centered:
            y = (TARGET_CELL - sprite.height) // 2
        else:
            y = TARGET_CELL - TARGET_GUTTER - sprite.height
        cell = Image.new("RGBA", (TARGET_CELL, TARGET_CELL), MAGENTA)
        cell.alpha_composite(sprite, (x, y))
        bbox = exact_nonmagenta_bbox(cell)
        if bbox is None:
            raise ValueError(f"pose {index} is empty")
        margins = (bbox[0], bbox[1], TARGET_CELL - bbox[2], TARGET_CELL - bbox[3])
        if min(margins) < 64:
            raise ValueError(f"pose {index} violates 64px gutter: {margins}")
        sheet.paste(cell, ((index - 1) * TARGET_CELL, 0))
        print(f"pose {index:02d}: bbox={bbox}, exact gutters={margins}")

    if sheet.size != (3072, 768):
        raise ValueError(f"wrong output dimensions: {sheet.size}")
    if sheet.getchannel("A").getextrema() != (255, 255):
        raise ValueError("output is not fully opaque")

    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=True)
    print(f"wrote {output} at {sheet.width}x{sheet.height}, RGBA opaque")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
