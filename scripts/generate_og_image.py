"""
Generate og-image.png — the link-preview image embedded via Open Graph /
Twitter Card meta tags in index.html. Regenerate by running:

    python scripts/generate_og_image.py

The output is committed to the repo root as og-image.png (referenced by
absolute URL in the meta tags, since WhatsApp won't fetch relative URLs).
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "og-image.png"

W, H = 1200, 630
BG       = (242, 237, 226)   # --bg light
SURFACE  = (251, 246, 233)   # --surface
BORDER   = (216, 209, 188)   # --border
TEXT     = (31, 31, 35)      # --text
MUTED    = (78, 78, 88)      # --text-muted
ACCENT   = (204, 32, 32)     # --accent
GRID     = (40, 30, 25, 70)  # grid lines (translucent)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")


def font(size, bold=True):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()


# --- LEFT PANEL: pixel circle preview ---------------------------------------
# 16x16 Euclidean filled circle, the canonical Pixel Round output.
GRID_N = 16
PANEL_X, PANEL_Y = 80, 95
PANEL_SIZE = 440
CELL = PANEL_SIZE // GRID_N

# panel background (canvas-like)
draw.rounded_rectangle(
    [PANEL_X - 14, PANEL_Y - 14,
     PANEL_X + PANEL_SIZE + 14, PANEL_Y + PANEL_SIZE + 14],
    radius=20, fill=SURFACE, outline=BORDER, width=2,
)

# grid
for i in range(GRID_N + 1):
    x = PANEL_X + i * CELL
    y = PANEL_Y + i * CELL
    draw.line([(x, PANEL_Y), (x, PANEL_Y + PANEL_SIZE)], fill=GRID, width=1)
    draw.line([(PANEL_X, y), (PANEL_X + PANEL_SIZE, y)], fill=GRID, width=1)

# Euclidean filled circle, diameter 16 → radius 8, center at (8,8)
cx = cy = GRID_N / 2.0
r = GRID_N / 2.0
for gy in range(GRID_N):
    for gx in range(GRID_N):
        # sample at cell center
        dx = (gx + 0.5) - cx
        dy = (gy + 0.5) - cy
        if dx * dx + dy * dy <= r * r:
            x0 = PANEL_X + gx * CELL
            y0 = PANEL_Y + gy * CELL
            draw.rectangle(
                [x0 + 1, y0 + 1, x0 + CELL - 1, y0 + CELL - 1],
                fill=ACCENT,
            )

# --- RIGHT PANEL: title + tagline + url -------------------------------------
RX = 600

# small brand chip (logo mark + name)
mark_cx, mark_cy, mark_r = RX + 22, 130, 18
draw.ellipse(
    [mark_cx - mark_r, mark_cy - mark_r, mark_cx + mark_r, mark_cy + mark_r],
    outline=ACCENT, width=4,
)
draw.ellipse(
    [mark_cx - 8, mark_cy - 8, mark_cx + 8, mark_cy + 8],
    fill=ACCENT,
)
draw.text((mark_cx + mark_r + 14, mark_cy - 18), "PIXEL ROUND",
          font=font(22), fill=MUTED)

# Title — two lines for impact. Font sized so the longer line still
# clears the right edge with a comfortable margin.
draw.text((RX, 185), "Pixel-perfect", font=font(66), fill=TEXT)
draw.text((RX, 265), "circles & spheres.", font=font(66), fill=ACCENT)

# Tagline
tagline = "Browser-based generator for pixel art\ncircles, ellipses, spheres and ellipsoids."
draw.multiline_text((RX, 395), tagline, font=font(28, bold=False),
                    fill=MUTED, spacing=10)

# URL pill at bottom
url = "vinisouza128.github.io/pixel-round"
url_font = font(24)
bbox = draw.textbbox((0, 0), url, font=url_font)
url_w = bbox[2] - bbox[0]
url_h = bbox[3] - bbox[1]
pill_pad_x, pill_pad_y = 18, 12
pill_x, pill_y = RX, 520
draw.rounded_rectangle(
    [pill_x, pill_y,
     pill_x + url_w + pill_pad_x * 2,
     pill_y + url_h + pill_pad_y * 2],
    radius=999, fill=SURFACE, outline=BORDER, width=2,
)
draw.text((pill_x + pill_pad_x, pill_y + pill_pad_y - 4), url,
          font=url_font, fill=TEXT)

# Save — optimize keeps file size well under WhatsApp's ~300KB ideal.
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")
