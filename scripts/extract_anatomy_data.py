#!/usr/bin/env python3
"""Ekstrak SYSTEMS lama dari Anatomi-Dasar.html secara terprogram (bukan ketik ulang manual),
lalu transformasikan ke skema baru sesuai spesifikasi Tahap 1."""
import re, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c = open(os.path.join(ROOT, 'Anatomi-Dasar.html'), encoding='utf-8').read()

# Ekstrak blok var SYSTEMS = {...}; secara bracket-balanced
m = re.search(r'var\s+SYSTEMS\s*=\s*\{', c)
start = m.end() - 1
depth = 0; i = start; instr = False; esc = False
while i < len(c):
    ch = c[i]
    if instr:
        if esc: esc = False
        elif ch == '\\': esc = True
        elif ch == "'": instr = False
    else:
        if ch == "'": instr = True
        elif ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: break
    i += 1
end = i + 1
systems_js = c[start:end]

# SYSTEMS pakai object literal JS (bukan JSON murni - single quotes, unquoted keys).
# Parse via Node untuk akurasi 100% (bukan regex manual yang rawan salah).
