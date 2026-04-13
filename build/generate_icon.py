"""Generate NoteChaps app icon (.ico + .png) using Pillow."""
from PIL import Image, ImageDraw
import os, struct, io

DIR = os.path.dirname(os.path.abspath(__file__))

def make_icon(size: int) -> Image.Image:
    """Create a NoteChaps icon at the given size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.08
    r = size * 0.18

    bg_color = (42, 45, 62, 255)
    accent = (74, 158, 255, 255)

    # Rounded rectangle background
    x0, y0, x1, y1 = pad, pad, size - pad, size - pad
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=bg_color)

    # Subtle border
    border_color = (74, 158, 255, 60)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, outline=border_color, width=max(1, size // 64))

    # "N" monogram
    inner_pad = size * 0.24
    left = inner_pad
    right = size - inner_pad
    top = inner_pad + size * 0.02
    bottom = size - inner_pad + size * 0.02
    stroke_w = max(2, int(size * 0.10))

    draw.line([(left, bottom), (left, top)], fill=accent, width=stroke_w)
    draw.line([(left, top), (right, bottom)], fill=accent, width=stroke_w)
    draw.line([(right, bottom), (right, top)], fill=accent, width=stroke_w)

    # Small pen accent at bottom-right
    pen_start_x = right - size * 0.02
    pen_start_y = bottom + size * 0.06
    pen_end_x = right + size * 0.08
    pen_end_y = bottom - size * 0.04
    pen_color = (130, 190, 255, 255)
    pen_w = max(1, stroke_w // 2)
    draw.line([(pen_start_x, pen_start_y), (pen_end_x, pen_end_y)], fill=pen_color, width=pen_w)

    dot_r = max(1, pen_w)
    draw.ellipse(
        [pen_start_x - dot_r, pen_start_y - dot_r, pen_start_x + dot_r, pen_start_y + dot_r],
        fill=pen_color
    )

    return img


def build_ico(images_dict, path):
    """Build a proper .ico file manually from PIL images."""
    sizes_to_include = [16, 24, 32, 48, 64, 128, 256]
    entries = []

    for s in sizes_to_include:
        img = images_dict[s].convert('RGBA')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        png_data = buf.getvalue()

        w = 0 if s >= 256 else s
        h = 0 if s >= 256 else s
        entries.append((w, h, png_data))

    num = len(entries)
    # ICO header: 2(reserved) + 2(type=1) + 2(count)
    header = struct.pack('<HHH', 0, 1, num)

    # Each directory entry: 16 bytes
    dir_offset = 6 + num * 16
    directory = b''
    data_blobs = b''

    for (w, h, png_data) in entries:
        # ICONDIRENTRY: width, height, color_count, reserved, planes, bit_count, size, offset
        entry = struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png_data), dir_offset + len(data_blobs))
        directory += entry
        data_blobs += png_data

    with open(path, 'wb') as f:
        f.write(header + directory + data_blobs)


# Generate PNGs at multiple sizes
sizes = [16, 24, 32, 48, 64, 128, 256, 512]
images = {}
for s in sizes:
    img = make_icon(s)
    images[s] = img

# Save main icon.png (256x256)
images[256].save(os.path.join(DIR, 'icon.png'))

# Build proper ICO
build_ico(images, os.path.join(DIR, 'icon.ico'))

ico_size = os.path.getsize(os.path.join(DIR, 'icon.ico'))
png_size = os.path.getsize(os.path.join(DIR, 'icon.png'))
print(f"icon.ico: {ico_size:,} bytes")
print(f"icon.png: {png_size:,} bytes")
print("Done!")
