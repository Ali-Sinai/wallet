"""Generate simple PWA icon PNGs with no external dependencies (pure stdlib).

Draws the wallet "W" mark (knockout style, matching Design/.../Wallet Logo.dc.html
option 6a): a rounded green square with a dark wallet body outline and a W stroke.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

GREEN = (15, 155, 110, 255)
DARK = (4, 18, 12, 255)
TRANSPARENT = (0, 0, 0, 0)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def in_rounded_rect(x: float, y: float, x0: float, y0: float, x1: float, y1: float, r: float) -> bool:
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    # check corners
    corners = [(x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)]
    in_corner_zone = (x < x0 + r or x > x1 - r) and (y < y0 + r or y > y1 - r)
    if not in_corner_zone:
        return True
    cx, cy = min(corners, key=lambda c: (c[0] - x) ** 2 + (c[1] - y) ** 2)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def dist_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    proj_x, proj_y = ax + t * dx, ay + t * dy
    return ((px - proj_x) ** 2 + (py - proj_y) ** 2) ** 0.5


def make_icon(size: int, maskable: bool = False) -> bytes:
    pad = size * 0.12 if maskable else size * 0.02
    radius = size * 0.22
    pixels = [[TRANSPARENT] * size for _ in range(size)]

    for y in range(size):
        for x in range(size):
            if in_rounded_rect(x, y, pad, pad, size - pad, size - pad, radius):
                pixels[y][x] = GREEN

    scale = 0.62 if not maskable else 0.44
    cx = size / 2
    cy = size / 2 + size * 0.03
    half = size * scale / 2
    top = cy - size * 0.14
    bottom = cy + size * 0.14
    mid_top = top + size * 0.06
    points = [
        (cx - half, top),
        (cx - half / 2, bottom),
        (cx, mid_top),
        (cx + half / 2, bottom),
        (cx + half, top),
    ]
    stroke_width = max(2.0, size * 0.05)

    body_x0, body_y0 = pad + size * 0.10, pad + size * 0.10
    body_x1, body_y1 = size - pad - size * 0.10, size - pad - size * 0.10
    border_width = max(1.5, size * 0.025)

    for y in range(size):
        for x in range(size):
            if pixels[y][x] == TRANSPARENT:
                continue
            # wallet body outline
            near_border = (
                in_rounded_rect(x, y, body_x0, body_y0, body_x1, body_y1, size * 0.09)
                and not in_rounded_rect(
                    x, y, body_x0 + border_width, body_y0 + border_width,
                    body_x1 - border_width, body_y1 - border_width, size * 0.07,
                )
            )
            if near_border:
                pixels[y][x] = DARK
                continue
            # W stroke
            for i in range(len(points) - 1):
                ax, ay = points[i]
                bx, by = points[i + 1]
                if dist_to_segment(x + 0.5, y + 0.5, ax, ay, bx, by) <= stroke_width:
                    pixels[y][x] = DARK
                    break

    return encode_png(pixels, size, size)


def encode_png(pixels: list[list[tuple[int, int, int, int]]], width: int, height: int) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", zlib.crc32(tag + data))

    raw = bytearray()
    for row in pixels:
        raw.append(0)  # no filter
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    ihdr = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "icon-192.png").write_bytes(make_icon(192))
    (OUT_DIR / "icon-512.png").write_bytes(make_icon(512))
    (OUT_DIR / "icon-512-maskable.png").write_bytes(make_icon(512, maskable=True))
    print(f"wrote icons to {OUT_DIR}")


if __name__ == "__main__":
    main()
