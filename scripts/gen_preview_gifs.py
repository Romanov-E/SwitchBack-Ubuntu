#!/usr/bin/env python3
"""
Generate realistic animated preview GIFs for SwitchBack Ubuntu.
Creates both Russian and English versions for README documentation.
"""
import cairo
import math
import os
from PIL import Image

OUT_DIR = "docs/screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

def draw_rounded_rect(cr, x, y, w, h, r):
    cr.new_sub_path()
    cr.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    cr.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    cr.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    cr.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    cr.close_path()

PRESETS = [
    {
        "id": "top-white",
        "pos": "top",
        "mode": "to-center",
        "color": (1.0, 1.0, 1.0), # #ffffff Pure White
        "fraction": 0.70,
        "thickness": 5,
        "radius": 3,
        "title_ru": "Сверху экрана — Сжатие к центру (Белый)",
        "title_en": "Top Screen Edge — Contract to Center (White)",
    },
    {
        "id": "top-right-orange",
        "pos": "top-right",
        "mode": "to-corner",
        "color": (0.914, 0.329, 0.125), # #e95420 Ubuntu Orange
        "fraction": 0.30,
        "thickness": 5,
        "radius": 2,
        "title_ru": "Верхний правый угол — L-образный (Orange)",
        "title_en": "Top-Right Corner — L-Bracket (Orange)",
    },
    {
        "id": "bottom-green",
        "pos": "bottom",
        "mode": "to-edges",
        "color": (0.18, 0.84, 0.45), # #2ed573 Emerald Green
        "fraction": 0.65,
        "thickness": 5,
        "radius": 3,
        "title_ru": "Снизу экрана — К краям (Изумрудный)",
        "title_en": "Bottom Screen Edge — Expand to Edges (Green)",
    },
    {
        "id": "all-corners-cyan",
        "pos": "all-corners",
        "mode": "to-center",
        "color": (0.0, 0.85, 1.0), # #00d9ff Cyber Cyan
        "fraction": 0.25,
        "thickness": 4,
        "radius": 2,
        "title_ru": "Все 4 угла экрана — HUD (Неоновый циан)",
        "title_en": "All 4 Corners HUD (Cyber Cyan)",
    },
    {
        "id": "dual-amber",
        "pos": "top-bottom",
        "mode": "to-center",
        "color": (0.984, 0.659, 0.047), # #fba80c Amber Gold
        "fraction": 0.55,
        "thickness": 5,
        "radius": 3,
        "title_ru": "Сверху и снизу экрана (Янтарный)",
        "title_en": "Dual Top & Bottom Bars (Amber Gold)",
    },
    {
        "id": "dual-purple",
        "pos": "left-right",
        "mode": "to-edges",
        "color": (0.65, 0.35, 0.95), # #a659f2 Cyber Purple
        "fraction": 0.45,
        "thickness": 5,
        "radius": 3,
        "title_ru": "Слева и справа экрана (Кибер-фиолетовый)",
        "title_en": "Dual Left & Right Bars (Cyber Purple)",
    },
]

W, H = 400, 250
num_frames = 28

def generate_gif(preset, lang, out_filename):
    title = preset["title_ru"] if lang == "ru" else preset["title_en"]
    pos = preset["pos"]
    mode = preset["mode"]
    col = preset["color"]
    fraction = preset["fraction"]
    t = preset["thickness"]
    rad = preset["radius"]

    m_h = 160
    m_w = int(m_h * 16 / 9) # 284
    mx = int((W - m_w) / 2)
    my = 22

    hMax = int(m_w * fraction)
    vMax = int(m_h * fraction)

    # Calculate arm definitions
    arms = []
    if pos == "top":
        start_x = mx + int((m_w - hMax) / 2)
        arms.append({"v": False, "fixed": my + 2, "start": start_x, "end": start_x + hMax})
    elif pos == "bottom":
        start_x = mx + int((m_w - hMax) / 2)
        arms.append({"v": False, "fixed": my + m_h - t - 3, "start": start_x, "end": start_x + hMax})
    elif pos == "top-bottom":
        start_x = mx + int((m_w - hMax) / 2)
        arms.append({"v": False, "fixed": my + 2, "start": start_x, "end": start_x + hMax})
        arms.append({"v": False, "fixed": my + m_h - t - 3, "start": start_x, "end": start_x + hMax})
    elif pos == "left-right":
        start_y = my + int((m_h - vMax) / 2)
        arms.append({"v": True, "fixed": mx + 3, "start": start_y, "end": start_y + vMax})
        arms.append({"v": True, "fixed": mx + m_w - t - 3, "start": start_y, "end": start_y + vMax})
    elif pos == "top-right":
        arms.append({"v": False, "fixed": my + 2, "start": mx + m_w - hMax - 3, "end": mx + m_w - 3, "corner_end": True})
        arms.append({"v": True, "fixed": mx + m_w - t - 3, "start": my + 2, "end": my + vMax + 2, "corner_start": True})
    elif pos == "all-corners":
        # TL
        arms.append({"v": False, "fixed": my + 2, "start": mx + 3, "end": mx + hMax + 3})
        arms.append({"v": True, "fixed": mx + 3, "start": my + 2, "end": my + vMax + 2})
        # TR
        arms.append({"v": False, "fixed": my + 2, "start": mx + m_w - hMax - 3, "end": mx + m_w - 3})
        arms.append({"v": True, "fixed": mx + m_w - t - 3, "start": my + 2, "end": my + vMax + 2})
        # BL
        arms.append({"v": False, "fixed": my + m_h - t - 3, "start": mx + 3, "end": mx + hMax + 3})
        arms.append({"v": True, "fixed": mx + 3, "start": my + m_h - vMax - 3, "end": my + m_h - 3})
        # BR
        arms.append({"v": False, "fixed": my + m_h - t - 3, "start": mx + m_w - hMax - 3, "end": mx + m_w - 3})
        arms.append({"v": True, "fixed": mx + m_w - t - 3, "start": my + m_h - vMax - 3, "end": my + m_h - 3})

    frames = []
    for f in range(num_frames):
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
        cr = cairo.Context(surface)

        # Clean solid card background (fills entire rectangle, eliminating corner artifacts)
        cr.set_source_rgb(0.98, 0.98, 0.99)
        cr.paint()

        # Subtle 1px rectangular card border
        cr.rectangle(0.5, 0.5, W - 1, H - 1)
        cr.set_source_rgba(0, 0, 0, 0.07)
        cr.set_line_width(1)
        cr.stroke()

        # Monitor drop shadow
        draw_rounded_rect(cr, mx - 3, my - 2, m_w + 6, m_h + 6, 12)
        cr.set_source_rgba(0, 0, 0, 0.07)
        cr.fill()

        # Monitor screen
        draw_rounded_rect(cr, mx, my, m_w, m_h, 10)
        cr.set_source_rgb(0.12, 0.13, 0.16)
        cr.fill_preserve()
        cr.set_source_rgba(0.4, 0.45, 0.55, 0.35)
        cr.set_line_width(1)
        cr.stroke()

        # Animation timing
        if f < 18:
            progress = 1.0 - (f / 18.0)
            opacity = 1.0
        elif f < 22:
            progress = 0.0
            opacity = 0.0
        else:
            fade_p = (f - 22) / 6.0
            progress = 1.0
            opacity = min(1.0, fade_p)

        cr.set_source_rgba(col[0], col[1], col[2], opacity)

        for arm in arms:
            maxLen = arm["end"] - arm["start"]
            mid = int((arm["start"] + arm["end"]) / 2)

            if mode == "to-edges" or mode == "from-edges-to-center":
                halfA = maxLen // 2
                halfB = maxLen - halfA
                p = (1.0 - progress) if mode == "from-edges-to-center" else progress
                lenA = int(halfA * p)
                lenB = int(halfB * p)
                if p >= 0.98:
                    barR = min(rad, t // 2, maxLen // 2)
                    if arm["v"]:
                        draw_rounded_rect(cr, arm["fixed"], arm["start"], t, maxLen, barR)
                    else:
                        draw_rounded_rect(cr, arm["start"], arm["fixed"], maxLen, t, barR)
                    cr.fill()
                else:
                    if lenA > 0:
                        rA = min(rad, t // 2, lenA // 2)
                        if arm["v"]:
                            draw_rounded_rect(cr, arm["fixed"], arm["start"], t, lenA, rA)
                        else:
                            draw_rounded_rect(cr, arm["start"], arm["fixed"], lenA, t, rA)
                        cr.fill()
                    if lenB > 0:
                        rB = min(rad, t // 2, lenB // 2)
                        coordB = arm["end"] - lenB
                        if arm["v"]:
                            draw_rounded_rect(cr, arm["fixed"], coordB, t, lenB, rB)
                        else:
                            draw_rounded_rect(cr, coordB, arm["fixed"], lenB, t, rB)
                        cr.fill()
            elif mode == "to-corner":
                length = int(maxLen * progress)
                if length > 0:
                    barR = min(rad, t // 2, length // 2)
                    if arm.get("corner_end"):
                        coord = arm["end"] - length
                    else:
                        coord = arm["start"]
                    if arm["v"]:
                        draw_rounded_rect(cr, arm["fixed"], coord, t, length, barR)
                    else:
                        draw_rounded_rect(cr, coord, arm["fixed"], length, t, barR)
                    cr.fill()
            else: # to-center
                length = int(maxLen * progress)
                coord = int(mid - length / 2)
                if length > 0:
                    barR = min(rad, t // 2, length // 2)
                    if arm["v"]:
                        draw_rounded_rect(cr, arm["fixed"], coord, t, length, barR)
                    else:
                        draw_rounded_rect(cr, coord, arm["fixed"], length, t, barR)
                    cr.fill()

        # Title caption at bottom
        cr.set_source_rgba(0.2, 0.25, 0.35, 0.9)
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        cr.set_font_size(12)
        ext = cr.text_extents(title)
        cr.move_to(int((W - ext.width) / 2), my + m_h + 30)
        cr.show_text(title)

        surface.flush()
        buf = surface.get_data()
        img = Image.frombuffer("RGBA", (W, H), buf, "raw", "BGRA", 0, 1)
        frames.append(img.convert("RGB"))

    frames[0].save(
        out_filename,
        save_all=True,
        append_images=frames[1:],
        duration=65,
        loop=0,
        optimize=True
    )
    print(f"Generated ({lang}): {out_filename}")

def main():
    for p in PRESETS:
        # Russian version
        ru_file = os.path.join(OUT_DIR, f"preview-{p['id']}.gif")
        generate_gif(p, "ru", ru_file)

        # English version
        en_file = os.path.join(OUT_DIR, f"preview-{p['id']}-en.gif")
        generate_gif(p, "en", en_file)

if __name__ == "__main__":
    main()
