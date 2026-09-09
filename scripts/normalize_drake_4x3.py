#!/usr/bin/env python3
"""Normalize the generated NOMAD drake sheet to the requested production grid."""

from pathlib import Path
import sys
from collections import deque

from PIL import Image, ImageFilter


COLS = 4
ROWS = 3
CELL = 768
INNER = 624
GUTTER = (CELL - INNER) // 2
MAGENTA = (255, 0, 255, 255)
AIRBORNE = {8, 9, 10}


def alpha_bbox(image: Image.Image, threshold: int = 16):
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    return mask.getbbox()


def keep_largest_component(image: Image.Image, threshold: int = 16) -> Image.Image:
    """Remove disconnected generator fragments while preserving the main silhouette."""
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    components = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or pixels[x, y] < threshold:
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
                    if seen[neighbour] or pixels[nx, ny] < threshold:
                        continue
                    seen[neighbour] = 1
                    queue.append((nx, ny))
            components.append(component)

    if not components:
        raise ValueError("cell has no visible component")
    largest = max(components, key=len)
    allowed = Image.new("L", image.size, 0)
    allowed_pixels = allowed.load()
    for x, y in largest:
        allowed_pixels[x, y] = 255
    # Restore the main component's antialiased fringe without reconnecting distant debris.
    allowed = allowed.filter(ImageFilter.MaxFilter(5))
    cleaned_alpha = Image.composite(alpha, Image.new("L", image.size, 0), allowed)
    cleaned = image.copy()
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: normalize_drake_4x3.py INPUT.png OUTPUT.png")

    source_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    source = Image.open(source_path).convert("RGBA")

    if source.width % COLS or source.height % ROWS:
        raise ValueError(f"source size {source.size} is not divisible by {COLS}x{ROWS}")

    source_cell_w = source.width // COLS
    source_cell_h = source.height // ROWS
    if source_cell_w != source_cell_h:
        raise ValueError(f"source cells must be square, got {source_cell_w}x{source_cell_h}")

    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), MAGENTA)
    pose_boxes = []

    for row in range(ROWS):
        for col in range(COLS):
            pose = row * COLS + col + 1
            crop = source.crop(
                (
                    col * source_cell_w,
                    row * source_cell_h,
                    (col + 1) * source_cell_w,
                    (row + 1) * source_cell_h,
                )
            )
            crop = keep_largest_component(crop)
            scaled = crop.resize((INNER, INNER), Image.Resampling.LANCZOS)
            bbox = alpha_bbox(scaled)
            if bbox is None:
                raise ValueError(f"pose {pose} is empty")

            content_w = bbox[2] - bbox[0]
            content_h = bbox[3] - bbox[1]
            x = (CELL - content_w) // 2 - bbox[0]
            if pose in AIRBORNE:
                y = (CELL - content_h) // 2 - bbox[1]
            else:
                y = CELL - GUTTER - bbox[3]

            transparent_cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            transparent_cell.alpha_composite(scaled, (x, y))
            final_bbox = alpha_bbox(transparent_cell)
            if final_bbox is None:
                raise ValueError(f"pose {pose} vanished during placement")
            if (
                final_bbox[0] < GUTTER
                or final_bbox[1] < GUTTER
                or final_bbox[2] > CELL - GUTTER
                or final_bbox[3] > CELL - GUTTER
            ):
                raise ValueError(f"pose {pose} violates the {GUTTER}px protected gutter: {final_bbox}")

            cell_background = Image.new("RGBA", (CELL, CELL), MAGENTA)
            cell_background.alpha_composite(transparent_cell)
            sheet.paste(cell_background, (col * CELL, row * CELL))
            pose_boxes.append((pose, final_bbox))

    if sheet.size != (3072, 2304):
        raise ValueError(f"wrong final dimensions: {sheet.size}")
    if sheet.getchannel("A").getextrema() != (255, 255):
        raise ValueError("output is not fully opaque")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="PNG", optimize=True)

    print(f"wrote {output_path} at {sheet.width}x{sheet.height}, RGBA opaque")
    for pose, bbox in pose_boxes:
        print(f"pose {pose:02d}: bbox={bbox}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
