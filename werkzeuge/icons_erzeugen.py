"""Erzeugt die App-Icons (icons/icon-192.png, icon-512.png, maskable-512.png).
Aufruf im App-Ordner:  python werkzeuge/icons_erzeugen.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ZIEL = Path(__file__).resolve().parent.parent / "icons"
ZIEL.mkdir(exist_ok=True)
FILZ = (31, 77, 58)
KARTE = (250, 246, 234)
GOLD = (168, 122, 34)
SCHRIFT = r"C:\Windows\Fonts\georgiab.ttf"


def icon(groesse, maskable=False):
    s = groesse
    img = Image.new("RGB", (s, s), FILZ)
    d = ImageDraw.Draw(img)
    # sichere Zone für maskable Icons: inneres 80 %
    rand = s * (0.24 if maskable else 0.16)
    b = s - 2 * rand          # Kartenbreite-Raum
    w, h = b * 0.68, b
    x0, y0 = (s - w) / 2, rand
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=s * 0.05, fill=KARTE, outline=GOLD, width=max(2, s // 64))
    font = ImageFont.truetype(SCHRIFT, int(h * 0.30))
    text = "XXI"
    tb = d.textbbox((0, 0), text, font=font)
    d.text((s / 2 - (tb[2] + tb[0]) / 2, y0 + h / 2 - (tb[3] + tb[1]) / 2), text, font=font, fill=FILZ)
    return img


icon(192).save(ZIEL / "icon-192.png")
icon(512).save(ZIEL / "icon-512.png")
icon(512, maskable=True).save(ZIEL / "maskable-512.png")
print("Icons erzeugt in", ZIEL)
