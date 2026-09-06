#!/usr/bin/env python3
"""
build-human-body-glb.py — Generator model 3D tubuh manusia (glTF 2.0 GLB)
==========================================================================
Membuat assets/anatomy/models/human-body.glb TANPA dependensi (stdlib saja):
figure humanoid bergaya klinis-stylized dari bola & silinder, 24 bagian yang
mencerminkan istilah Kaigo di Anatomi-Dasar.html (頭 kepala, 首 leher,
肩 bahu, 腕 lengan, 手 tangan, もも paha, 膝 lutut, 足首 pergelangan).

Pemakaian:
    python3 scripts/build-human-body-glb.py           # tulis GLB
    python3 scripts/build-human-body-glb.py --check   # validasi struktural GLB

Kenapa prosedural? Aset GLB profesional (scan tubuh) berukuran puluhan MB dan
bermasalah lisensi; untuk pembelajaran istilah, siluet stylized jelas & ringan
(~50 KB) sudah memadai — sejalan dengan catatan pengembangan di SVG 2D halaman
yang menunggu aset profesional di assets/anatomy/images/ kala depan.

Format keluaran: GLB valid (header 12-byte + chunk JSON + chunk BIN, semua
4-byte aligned), material PBR metallic-roughness, normal analitik, indeks
32-bit.
"""
import json
import math
import os
import struct
import sys

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "anatomy", "models", "human-body.glb")

# ── Palet (mengikuti nuansa klinis halaman: kulit netral + aksen merah A63A3A) ──
MATERIALS = [
    {"name": "Kulit",       "color": [0.910, 0.725, 0.608, 1.0]},  # E8B99B
    {"name": "Kulit Gelap", "color": [0.851, 0.651, 0.494, 1.0]},  # D9A67E
    {"name": "Atasan",      "color": [0.651, 0.227, 0.227, 1.0]},  # A63A3A (aksen halaman)
    {"name": "Celana",      "color": [0.306, 0.365, 0.420, 1.0]},  # 4E5D6B
    {"name": "Sepatu",      "color": [0.227, 0.196, 0.188, 1.0]},  # 3A3230
]
M_SKIN, M_SKIN_D, M_TOP, M_PANTS, M_SHOE = 0, 1, 2, 3, 4

SEG, RINGS = 20, 12  # resolusi silinder / bola

# ── Definisi bagian: "s" = bola ter-skala (p=posisi, s=skala xyz),
#    "c" = silinder vertikal (p=posisi tengah, r=radius, h=tinggi). ──
# Sumbu y ke atas; telapak di y≈0; tinggi total ±1.69 "meter" model.
PARTS = [
    # Torso (berpakaian)
    {"n": "Mune Dada",          "k": "s", "p": (0, 1.260, 0), "s": (.170, .130, .105), "m": M_TOP},
    {"n": "Onaka Perut",        "k": "s", "p": (0, 1.060, 0), "s": (.155, .110, .095), "m": M_TOP},
    {"n": "Koshi Pinggul",      "k": "s", "p": (0, 0.920, 0), "s": (.160, .100, .100), "m": M_PANTS},
    # Kepala & leher
    {"n": "Kubi Leher",         "k": "c", "p": (0, 1.420, 0), "r": .050, "h": .100, "m": M_SKIN},
    {"n": "Atama Kepala",       "k": "s", "p": (0, 1.565, 0), "s": (.105, .125, .100), "m": M_SKIN},
    # Lengan kiri & kanan: bahu → lengan atas → siku → lengan bawah → tangan
    {"n": "Kata Bahu Kiri",     "k": "s", "p": (-.215, 1.350, 0), "s": (.055, .055, .055), "m": M_TOP},
    {"n": "Kata Bahu Kanan",    "k": "s", "p": (.215, 1.350, 0),  "s": (.055, .055, .055), "m": M_TOP},
    {"n": "Ude Atas Kiri",      "k": "c", "p": (-.235, 1.200, 0), "r": .045, "h": .260, "m": M_SKIN},
    {"n": "Ude Atas Kanan",     "k": "c", "p": (.235, 1.200, 0),  "r": .045, "h": .260, "m": M_SKIN},
    {"n": "Hiji Siku Kiri",     "k": "s", "p": (-.245, 1.060, 0), "s": (.040, .040, .040), "m": M_SKIN},
    {"n": "Hiji Siku Kanan",    "k": "s", "p": (.245, 1.060, 0),  "s": (.040, .040, .040), "m": M_SKIN},
    {"n": "Ude Bawah Kiri",     "k": "c", "p": (-.255, 0.930, 0), "r": .038, "h": .240, "m": M_SKIN},
    {"n": "Ude Bawah Kanan",    "k": "c", "p": (.255, 0.930, 0),  "r": .038, "h": .240, "m": M_SKIN},
    {"n": "Te Tangan Kiri",     "k": "s", "p": (-.265, 0.780, .005), "s": (.040, .065, .028), "m": M_SKIN_D},
    {"n": "Te Tangan Kanan",    "k": "s", "p": (.265, 0.780, .005),  "s": (.040, .065, .028), "m": M_SKIN_D},
    # Kaki kiri & kanan: paha → lutut → betis → kaki
    {"n": "Momo Paha Kiri",     "k": "c", "p": (-.095, 0.720, 0), "r": .065, "h": .360, "m": M_PANTS},
    {"n": "Momo Paha Kanan",    "k": "c", "p": (.095, 0.720, 0),  "r": .065, "h": .360, "m": M_PANTS},
    {"n": "Hiza Lutut Kiri",    "k": "s", "p": (-.095, 0.530, 0), "s": (.055, .055, .055), "m": M_SKIN},
    {"n": "Hiza Lutut Kanan",   "k": "s", "p": (.095, 0.530, 0),  "s": (.055, .055, .055), "m": M_SKIN},
    {"n": "Ashi Betis Kiri",    "k": "c", "p": (-.100, 0.340, 0), "r": .050, "h": .360, "m": M_SKIN},
    {"n": "Ashi Betis Kanan",   "k": "c", "p": (.100, 0.340, 0),  "r": .050, "h": .360, "m": M_SKIN},
    {"n": "Ashikubi Kaki Kiri", "k": "s", "p": (-.100, 0.055, .030), "s": (.055, .050, .130), "m": M_SHOE},
    {"n": "Ashikubi Kaki Kanan", "k": "s", "p": (.100, 0.055, .030),  "s": (.055, .050, .130), "m": M_SHOE},
]


def sphere(scale):
    """Bola ter-skala: posisi + normal analitik (n = p/(r²) lalu dinormalisasi)."""
    sx, sy, sz = scale
    pos, nrm, idx = [], [], []
    for i in range(RINGS + 1):
        phi = math.pi * i / RINGS
        for j in range(SEG):
            th = 2 * math.pi * j / SEG
            x, y, z = math.sin(phi) * math.cos(th), math.cos(phi), math.sin(phi) * math.sin(th)
            pos.append((x * sx, y * sy, z * sz))
            nx, ny, nz = x / sx, y / sy, z / sz
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nrm.append((nx / ln, ny / ln, nz / ln))
    for i in range(RINGS):
        for j in range(SEG):
            a = i * SEG + j
            b = i * SEG + (j + 1) % SEG
            c = (i + 1) * SEG + (j + 1) % SEG
            d = (i + 1) * SEG + j
            idx += [a, b, c, a, c, d]
    return pos, nrm, idx


def cylinder(r, h):
    """Silinder vertikal berpusat di origin: sisi + dua tutup, normal analitik."""
    pos, nrm, idx = [], [], []
    hy = h / 2.0
    # Rim atas (0..SEG-1) & rim bawah (SEG..2SEG-1), pusat tutup (2SEG, 2SEG+1)
    for j in range(SEG):
        th = 2 * math.pi * j / SEG
        x, z = math.cos(th) * r, math.sin(th) * r
        pos += [(x, hy, z), (x, -hy, z)]
        nrm += [(math.cos(th), 0, math.sin(th))] * 2
    pos += [(0, hy, 0), (0, -hy, 0)]
    nrm += [(0, 1, 0), (0, -1, 0)]
    ct, cb = 2 * SEG, 2 * SEG + 1
    for j in range(SEG):
        t0, b0 = j, SEG + j
        t1, b1 = (j + 1) % SEG, SEG + (j + 1) % SEG
        idx += [t0, b0, b1, t0, b1, t1]   # sisi
        idx += [ct, t1, t0]               # tutup atas
        idx += [cb, b0, b1]               # tutup bawah
    return pos, nrm, idx


def build_gltf():
    nodes, meshes, accessors, views = [], [], [], []
    bin = bytearray()

    def add_view(data, target=None):
        off = (len(bin) + 3) & ~3
        bin.extend(b"\x00" * (off - len(bin)))
        bin.extend(data)
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            v["target"] = 34963
        views.append(v)
        return len(views) - 1

    def add_accessor(view, count, vtype, mn=None, mx=None):
        a = {"bufferView": view, "componentType": 5126 if vtype != "SCALAR" else 5125,
             "count": count, "type": vtype}
        if mn is not None:
            a["min"], a["max"] = mn, mx
        accessors.append(a)
        return len(accessors) - 1

    for part in PARTS:
        if part["k"] == "s":
            lp, ln, li = sphere(part["s"])
        else:
            lp, ln, li = cylinder(part["r"], part["h"])
        px, py, pz = part["p"]
        gp = [(x + px, y + py, z + pz) for (x, y, z) in lp]
        vview = add_view(struct.pack("<%df" % (len(gp) * 3), *[c for p in gp for c in p]))
        nview = add_view(struct.pack("<%df" % (len(ln) * 3), *[c for n in ln for c in n]))
        iview = add_view(struct.pack("<%dI" % len(li), *li))
        xs = [p[0] for p in gp]; ys = [p[1] for p in gp]; zs = [p[2] for p in gp]
        a_pos = add_accessor(vview, len(gp), "VEC3", [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)])
        a_nrm = add_accessor(nview, len(ln), "VEC3")
        a_idx = add_accessor(iview, len(li), "SCALAR")
        meshes.append({"primitives": [{
            "attributes": {"POSITION": a_pos, "NORMAL": a_nrm},
            "indices": a_idx, "material": part["m"], "mode": 4}]})
        nodes.append({"name": part["n"], "mesh": len(meshes) - 1})

    while len(bin) % 4:
        bin.append(0)

    gltf = {
        "asset": {"version": "2.0",
                  "generator": "scripts/build-human-body-glb.py (prosedural, tanpa dependensi)"},
        "scene": 0,
        "scenes": [{"name": "TubuhManusia", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": [{"name": m["name"], "pbrMetallicRoughness": {
            "baseColorFactor": m["color"], "metallicFactor": 0.0, "roughnessFactor": 0.8}}
            for m in MATERIALS],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(bin)}],
    }
    return gltf, bytes(bin)


def write_glb():
    gltf, bin_data = build_gltf()
    js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(js) % 4:
        js += b" "
    while len(bin_data) % 4:
        bin_data += b"\x00"
    total = 12 + 8 + len(js) + 8 + len(bin_data)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))        # magic 'glTF', versi 2, panjang total
        f.write(struct.pack("<II", len(js), 0x4E4F534A))          # chunk JSON
        f.write(js)
        f.write(struct.pack("<II", len(bin_data), 0x004E4942))    # chunk BIN
        f.write(bin_data)
    return total, len(gltf["nodes"])


def check_glb():
    """Validasi struktural: header, alignment, batas aksesor, indeks < vertex."""
    with open(OUT, "rb") as f:
        data = f.read()
    magic, ver, total = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67 and ver == 2, "header GLB salah"
    assert total == len(data), "panjang total ≠ ukuran file"
    jlen, jtype = struct.unpack_from("<II", data, 12)
    assert jtype == 0x4E4F534A, "chunk pertama bukan JSON"
    gltf = json.loads(data[20:20 + jlen].decode("utf-8"))
    off = 20 + jlen
    blen, btype = struct.unpack_from("<II", data, off)
    assert btype == 0x004E4942, "chunk kedua bukan BIN"
    bindata = data[off + 8:off + 8 + blen]
    assert gltf["buffers"][0]["byteLength"] <= blen, "buffer > chunk BIN"
    tris = 0
    for m in gltf["meshes"]:
        for p in m["primitives"]:
            acc = gltf["accessors"][p["indices"]]
            bv = gltf["bufferViews"][acc["bufferView"]]
            assert bv["byteOffset"] % 4 == 0, "byteOffset indeks tidak 4-aligned"
            idxs = struct.unpack_from("<%dI" % acc["count"], bindata, bv["byteOffset"])
            vcount = gltf["accessors"][p["attributes"]["POSITION"]]["count"]
            assert max(idxs) < vcount, "indeks di luar jumlah vertex"
            tris += acc["count"] // 3
    verts = sum(a["count"] for a in gltf["accessors"]
                if a["type"] == "VEC3" and "max" in a)
    print("OK  %s" % os.path.relpath(OUT, os.getcwd()))
    print("    node=%d mesh=%d material=%d vertex=%d triangle=%d ukuran=%.1f KB"
          % (len(gltf["nodes"]), len(gltf["meshes"]), len(gltf["materials"]),
             verts, tris, len(data) / 1024))


if __name__ == "__main__":
    if "--check" in sys.argv:
        check_glb()
    else:
        total, nnodes = write_glb()
        print("Ditulis %s (%.1f KB, %d bagian)" % (os.path.relpath(OUT, os.getcwd()), total / 1024, nnodes))
