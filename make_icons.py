#!/usr/bin/env python3
"""Генерация иконок PWA без внешних зависимостей (только stdlib).
Рисуем скруглённый квадрат с градиентом и белый символ обмена ⇄."""
import struct, zlib, math

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def in_rounded(x, y, S, r):
    # точка внутри скруглённого квадрата [0,S)
    cx = min(max(x, r), S - 1 - r)
    cy = min(max(y, r), S - 1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def make(S, fname):
    top = (56, 189, 248)    # голубой
    bot = (37, 99, 235)     # синий
    r = int(S * 0.22)
    px = bytearray()
    # геометрия стрелок
    bar_h = max(2, int(S * 0.085))
    arrow = int(S * 0.13)
    margin = int(S * 0.20)
    x0, x1 = margin, S - margin
    y_top = int(S * 0.40)
    y_bot = int(S * 0.60)

    def white_at(x, y):
        # верхняя стрелка -> вправо
        if abs(y - y_top) <= bar_h / 2 and x0 <= x <= x1 - arrow:
            return True
        if x1 - arrow <= x <= x1:
            d = (x1 - x)
            if abs(y - y_top) <= arrow - d * (arrow / arrow):  # треуг.
                pass
        # верхний наконечник (вправо)
        if x1 - arrow <= x <= x1:
            half = (x1 - x)  # 0 у острия
            if abs(y - y_top) <= half:
                return True
        # нижняя стрелка -> влево
        if abs(y - y_bot) <= bar_h / 2 and x0 + arrow <= x <= x1:
            return True
        if x0 <= x <= x0 + arrow:
            half = (x - x0)  # 0 у острия
            if abs(y - y_bot) <= half:
                return True
        return False

    for y in range(S):
        px.append(0)  # filter byte
        t = y / (S - 1)
        bg = lerp(top, bot, t)
        for x in range(S):
            if white_at(x, y):
                px += bytes((255, 255, 255, 255))
            else:
                px += bytes((*bg, 255))  # фон во весь квадрат (maskable)

    raw = bytes(px)
    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(fname, "wb") as f:
        f.write(png)
    print("wrote", fname, S)

make(192, "icon-192.png")
make(512, "icon-512.png")
make(180, "apple-touch-icon.png")
