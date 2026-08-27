#!/usr/bin/env python3
"""
Bangun Materi/Kaigo.html dari scripts/kaigo_catalog.py.

Katalog adalah SATU-SATUNYA sumber data. Halaman deterministik: modul selalu
diurutkan berdasarkan (category, order), bukan urutan dict.

Jangan mengedit Materi/Kaigo.html langsung — perubahan hilang saat regenerate.
Ubah katalog atau generator ini.

    python3 scripts/build_kaigo_page.py
"""
import html
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaigo_catalog import (  # noqa: E402
    CATEGORIES, LEVELS, MODULES, LEVEL_NAMES, modules_in, total_duration,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'Materi', 'Kaigo.html')
BASE_URL = 'https://nihonggopro.id'
BRAND = 'Nihonggo Pro Academy'
NL = '\n'


def esc(s):
    return html.escape(s or '', quote=True)


def attr(s):
    """data-* untuk pencarian: lowercase, aman sebagai atribut."""
    return html.escape((s or '').lower(), quote=True)


def dur(minutes):
    if minutes < 60:
        return f'{minutes} mnt'
    h, m = divmod(minutes, 60)
    return f'{h} j {m} mnt' if m else f'{h} jam'


def card(slug, m):
    """Kartu modul: class reusable, tanpa inline style, tanpa onclick."""
    ja = f'<span class="kg-card-ja">{esc(m["title_ja"])}</span>' if m['title_ja'] else ''

    prereq = ''
    if m['prerequisite'] and m['prerequisite'] in MODULES:
        pre = MODULES[m['prerequisite']]
        prereq = (f'<span class="kg-card-pre" title="Sebaiknya pelajari lebih dulu">'
                  f'↑ {esc(pre["title"])}</span>')

    return f'''          <a class="kg-card" href="{esc(m['filename'])}"
             id="kg-card-{esc(slug)}"
             data-key="{esc(slug)}"
             data-slug="{attr(slug)}"
             data-title="{attr(m['title'])}"
             data-ja="{attr(m['title_ja'] or '')}"
             data-desc="{attr(m['description'])}"
             data-tags="{attr(' '.join(m['tags']))}"
             data-category="{esc(m['category'])}"
             data-level="{esc(m['level'])}"
             data-order="{m['order']}"
             data-duration="{m['duration']}">
            <span class="kg-card-top">
              <span class="kg-card-icon" aria-hidden="true">{m['icon']}</span>
              <span class="kg-card-meta">
                <span class="kg-badge kg-badge--{esc(m['level'])}">{esc(LEVEL_NAMES[m['level']])}</span>
                <span class="kg-card-dur">{dur(m['duration'])}</span>
              </span>
            </span>
            <span class="kg-card-body">
              <span class="kg-card-title">{esc(m['title'])}</span>
              {ja}
              <span class="kg-card-desc">{esc(m['description'])}</span>
              {prereq}
            </span>
            <span class="kg-card-status" data-status="{esc(slug)}"></span>
          </a>'''


def build():
    total = len(MODULES)
    active = [c for c in CATEGORIES if modules_in(c[0])]

    cat_chips = ['        <button class="kg-chip is-active" type="button" data-filter-cat="all">'
                 f'Semua <span class="kg-chip-n">{total}</span></button>']
    for key, name, icon, _ in active:
        n = len(modules_in(key))
        cat_chips.append(f'        <button class="kg-chip" type="button" data-filter-cat="{key}">'
                         f'{icon} {esc(name)} <span class="kg-chip-n">{n}</span></button>')

    lvl_chips = ['        <button class="kg-chip kg-chip--sm is-active" type="button" '
                 'data-filter-lvl="all">Semua level</button>']
    for key, name, _ in LEVELS:
        n = sum(1 for m in MODULES.values() if m['level'] == key)
        if n:
            lvl_chips.append(f'        <button class="kg-chip kg-chip--sm" type="button" '
                             f'data-filter-lvl="{key}">{esc(name)} '
                             f'<span class="kg-chip-n">{n}</span></button>')

    sections = []
    for key, name, icon, blurb in active:
        items = modules_in(key)
        cards = NL.join(card(s, m) for s, m in items)
        sections.append(f'''      <section class="kg-group" data-group="{key}" aria-labelledby="kg-h-{key}">
        <header class="kg-group-head">
          <h2 class="kg-group-title" id="kg-h-{key}">
            <span class="kg-group-icon" aria-hidden="true">{icon}</span>
            {esc(name)}
            <span class="kg-group-count">{len(items)} modul · {dur(total_duration(key))}</span>
          </h2>
          <p class="kg-group-blurb">{esc(blurb)}</p>
          <div class="kg-group-prog">
            <div class="kg-group-bar">
              <div class="kg-group-fill" data-catfill="{key}"></div>
            </div>
            <span class="kg-group-pct" data-catpct="{key}">0%</span>
          </div>
        </header>
        <div class="kg-grid">
{cards}
        </div>
      </section>''')

    catalog_js = {s: {'c': m['category'], 'o': m['order'], 'd': m['duration'],
                      't': m['title'], 'n': m['recommended_next'], 'f': m['filename']}
                  for s, m in MODULES.items()}

    ordered = sorted(MODULES.items(), key=lambda x: (x[1]['category'], x[1]['order']))
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "CollectionPage",
             "@id": f"{BASE_URL}/Materi/Kaigo.html",
             "name": f"Materi Kaigo (介護) — {total} Modul Lengkap",
             "description": (f"Pusat materi Kaigo {BRAND}: {total} modul untuk calon 介護福祉士 — "
                             "bahasa & komunikasi, praktik perawatan, kesehatan lansia, "
                             "dokumentasi, hukum & etika, dan persiapan ujian nasional."),
             "inLanguage": "id",
             "isPartOf": {"@type": "WebSite", "@id": f"{BASE_URL}/#website", "name": BRAND}},
            {"@type": "BreadcrumbList",
             "itemListElement": [
                 {"@type": "ListItem", "position": 1, "name": "Beranda", "item": f"{BASE_URL}/"},
                 {"@type": "ListItem", "position": 2, "name": "Materi",
                  "item": f"{BASE_URL}/Materi/Materi.html"},
                 {"@type": "ListItem", "position": 3, "name": "Kaigo",
                  "item": f"{BASE_URL}/Materi/Kaigo.html"}]},
            {"@type": "ItemList", "name": "Modul Kaigo", "numberOfItems": total,
             "itemListElement": [
                 {"@type": "ListItem", "position": i, "name": m['title'],
                  "url": f"{BASE_URL}/Materi/{m['filename']}"}
                 for i, (s, m) in enumerate(ordered, 1)]},
        ],
    }

    css = '''
/* ── Pusat Materi Kaigo — class reusable, tanpa inline style ─────────────── */
.kg-wrap { max-width: 1180px; margin: 0 auto; padding: 0 1.1rem 4rem; }

.kg-crumb { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap;
  font-size: 12.5px; color: var(--ink-soft, #6b6b6b); padding: 1rem 0 .25rem; }
.kg-crumb a { color: inherit; text-decoration: none; border-bottom: 1px solid transparent; }
.kg-crumb a:hover { color: var(--kyoto-red, #be3428); border-bottom-color: currentColor; }
.kg-crumb-sep { opacity: .45; }
.kg-crumb-now { color: var(--ink, #15161a); font-weight: 600; }

.kg-hero { position: relative; overflow: hidden; border-radius: 18px; margin: .6rem 0 1.4rem;
  padding: 2.1rem 1.6rem; color: #fff;
  background: linear-gradient(135deg, #8f2820 0%, #be3428 55%, #d4553f 100%); }
.kg-hero::after { content: "介"; position: absolute; right: -.5rem; bottom: -2.6rem;
  font-family: 'Noto Serif JP', serif; font-size: 11rem; font-weight: 900;
  color: rgba(255,255,255,.09); line-height: 1; pointer-events: none; }
.kg-hero-kicker { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: .14em;
  text-transform: uppercase; background: rgba(255,255,255,.16);
  border: 1px solid rgba(255,255,255,.25); padding: .3rem .7rem;
  border-radius: 999px; margin-bottom: .8rem; }
.kg-hero-title { font-family: 'Noto Serif JP', serif; font-size: clamp(1.6rem, 4.2vw, 2.4rem);
  font-weight: 800; line-height: 1.25; margin: 0 0 .55rem; }
.kg-hero-title span { display: block; font-size: .58em; font-weight: 600; opacity: .9; margin-top: .3rem; }
.kg-hero-lead { max-width: 60ch; font-size: 14px; line-height: 1.75; opacity: .95; margin: 0 0 1.2rem; }
.kg-hero-stats { display: flex; flex-wrap: wrap; gap: .6rem; position: relative; z-index: 1; }
.kg-stat { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22);
  border-radius: 11px; padding: .55rem .85rem; min-width: 92px; }
.kg-stat-n { display: block; font-size: 1.3rem; font-weight: 800; line-height: 1.1; }
.kg-stat-l { display: block; font-size: 10.5px; opacity: .88; letter-spacing: .04em; margin-top: .15rem; }

.kg-prog { margin-top: 1rem; position: relative; z-index: 1; }
.kg-prog-bar { height: 7px; border-radius: 99px; background: rgba(255,255,255,.22); overflow: hidden; }
.kg-prog-fill { height: 100%; width: 0; border-radius: 99px; background: #fff;
  transition: width .5s cubic-bezier(.34,1.2,.64,1); }
.kg-prog-txt { font-size: 11.5px; opacity: .9; margin-top: .4rem; }

.kg-resume { display: none; align-items: center; gap: .8rem; flex-wrap: wrap;
  margin: 0 0 1.4rem; padding: .9rem 1.1rem; border-radius: 13px;
  background: var(--white, #fff); border: 1px solid var(--border-mid, #e0dcd6);
  border-left: 3px solid var(--kyoto-red, #be3428); }
.kg-resume.show { display: flex; }
.kg-resume-i { font-size: 1.3rem; color: var(--kyoto-red, #be3428); }
.kg-resume-b { flex: 1; min-width: 180px; }
.kg-resume-l { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--ink-soft, #6b6b6b); }
.kg-resume-t { display: block; font-size: 14px; font-weight: 700;
  color: var(--ink, #15161a); margin-top: .1rem; }
.kg-resume-go { font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap;
  color: #fff; background: var(--kyoto-red, #be3428); padding: .55rem 1rem; border-radius: 8px; }
.kg-resume-go:hover { background: #a12c22; }

.kg-tools { position: sticky; top: 62px; z-index: 20; padding: .75rem 0 .6rem;
  background: var(--bg, #faf8f5); }
.kg-search { position: relative; margin-bottom: .6rem; }
.kg-search-i { position: absolute; left: .85rem; top: 50%; transform: translateY(-50%);
  font-size: 15px; opacity: .5; pointer-events: none; }
.kg-search input { width: 100%; padding: .8rem 2.4rem .8rem 2.5rem; font: inherit; font-size: 14px;
  color: var(--ink, #15161a); background: var(--white, #fff);
  border: 1px solid var(--border-mid, #e0dcd6); border-radius: 12px; }
.kg-search input:focus { outline: none; border-color: var(--kyoto-red, #be3428);
  box-shadow: 0 0 0 3px rgba(190,52,40,.1); }
.kg-search-x { position: absolute; right: .55rem; top: 50%; transform: translateY(-50%);
  border: none; background: transparent; font-size: 17px; line-height: 1; cursor: pointer;
  color: var(--ink-soft, #6b6b6b); padding: .25rem .45rem; border-radius: 7px; display: none; }
.kg-search-x:hover { background: var(--surface, #f1ede7); }
.kg-search-x.show { display: block; }

.kg-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .5rem; }
.kg-chips { display: flex; gap: .45rem; overflow-x: auto; padding-bottom: .25rem;
  scrollbar-width: none; flex: 1; min-width: 0; }
.kg-chips::-webkit-scrollbar { display: none; }
.kg-chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: .35rem;
  padding: .5rem .8rem; font: inherit; font-size: 12.5px; font-weight: 600; white-space: nowrap;
  color: var(--ink-mid, #555); background: var(--white, #fff); cursor: pointer;
  border: 1px solid var(--border-mid, #e0dcd6); border-radius: 999px; transition: .15s; }
.kg-chip--sm { padding: .38rem .65rem; font-size: 11.5px; }
.kg-chip:hover { border-color: var(--kyoto-red, #be3428); color: var(--kyoto-red, #be3428); }
.kg-chip.is-active { background: var(--kyoto-red, #be3428);
  border-color: var(--kyoto-red, #be3428); color: #fff; }
.kg-chip-n { font-size: 10.5px; font-weight: 800; padding: .1rem .38rem; border-radius: 99px;
  background: rgba(0,0,0,.07); }
.kg-chip.is-active .kg-chip-n { background: rgba(255,255,255,.25); }

.kg-sort { flex: 0 0 auto; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--ink-mid, #555); background: var(--white, #fff); cursor: pointer;
  border: 1px solid var(--border-mid, #e0dcd6); border-radius: 9px; padding: .5rem .7rem; }
.kg-sort:focus { outline: none; border-color: var(--kyoto-red, #be3428); }
.kg-reset { flex: 0 0 auto; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  color: var(--ink-soft, #6b6b6b); background: transparent;
  border: 1px solid var(--border-mid, #e0dcd6); border-radius: 9px; padding: .5rem .7rem; }
.kg-reset:hover { border-color: var(--kyoto-red, #be3428); color: var(--kyoto-red, #be3428); }

.kg-group { margin-top: 2rem; scroll-margin-top: 150px; }
.kg-group[hidden] { display: none; }
.kg-group-head { margin-bottom: .9rem; }
.kg-group-title { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  font-family: 'Noto Serif JP', serif; font-size: 1.12rem; font-weight: 700;
  color: var(--ink, #15161a); margin: 0 0 .3rem; }
.kg-group-icon { font-size: 1.15rem; }
.kg-group-count { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  color: var(--kyoto-red, #be3428); background: rgba(190,52,40,.1);
  padding: .18rem .5rem; border-radius: 6px; }
.kg-group-blurb { font-size: 12.8px; line-height: 1.65; color: var(--ink-soft, #6b6b6b);
  max-width: 72ch; margin: 0 0 .5rem; }
.kg-group-prog { display: flex; align-items: center; gap: .5rem; max-width: 320px; }
.kg-group-bar { flex: 1; height: 5px; border-radius: 99px;
  background: var(--surface, #f1ede7); overflow: hidden; }
.kg-group-fill { height: 100%; width: 0; border-radius: 99px;
  background: var(--kyoto-red, #be3428); transition: width .4s ease; }
.kg-group-pct { font-size: 11px; font-weight: 700; color: var(--ink-soft, #6b6b6b);
  min-width: 30px; text-align: right; }

.kg-grid { display: grid; gap: .7rem;
  grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); }
.kg-card { position: relative; display: flex; flex-direction: column; gap: .55rem;
  padding: .9rem; text-decoration: none; color: inherit;
  background: var(--white, #fff); border: 1px solid var(--border-light, #ece8e2);
  border-radius: 13px; transition: transform .16s, border-color .16s, box-shadow .16s; }
.kg-card:hover { transform: translateY(-2px); border-color: var(--kyoto-red, #be3428);
  box-shadow: 0 6px 18px rgba(190,52,40,.1); }
.kg-card:focus-visible { outline: 2px solid var(--kyoto-red, #be3428); outline-offset: 2px; }
.kg-card[hidden] { display: none; }
.kg-card.is-done { border-color: rgba(46,125,50,.35); background: rgba(46,125,50,.03); }

.kg-card-top { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.kg-card-icon { font-size: 1.25rem; line-height: 1; }
.kg-card-meta { display: flex; align-items: center; gap: .35rem; }
.kg-badge { font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
  padding: .18rem .42rem; border-radius: 5px; }
.kg-badge--pemula { background: rgba(46,125,50,.12); color: #2e7d32; }
.kg-badge--menengah { background: rgba(21,101,192,.12); color: #1565c0; }
.kg-badge--mahir { background: rgba(190,52,40,.12); color: #be3428; }
.kg-card-dur { font-size: 10.5px; font-weight: 600; color: var(--ink-soft, #6b6b6b); }

.kg-card-body { display: flex; flex-direction: column; gap: .2rem; min-width: 0; }
.kg-card-title { font-size: 13px; font-weight: 700; line-height: 1.45; color: var(--ink, #15161a); }
.kg-card-ja { font-family: 'Noto Serif JP', serif; font-size: 11.5px; color: var(--ink-soft, #6b6b6b); }
.kg-card-desc { font-size: 11.5px; line-height: 1.55; color: var(--ink-soft, #6b6b6b); margin-top: .1rem; }
.kg-card-pre { font-size: 10.5px; font-weight: 600; color: var(--ink-soft, #6b6b6b);
  margin-top: .3rem; opacity: .8; }

.kg-card-status { position: absolute; top: .6rem; right: .6rem; width: 17px; height: 17px;
  border-radius: 50%; display: none; }
.kg-card-status.done { display: block; background: #2e7d32; }
.kg-card-status.done::after { content: "\\2713"; display: block; color: #fff; font-size: 10px;
  font-weight: 800; text-align: center; line-height: 17px; }

.kg-empty { display: none; text-align: center; padding: 3.2rem 1rem; }
.kg-empty.show { display: block; }
.kg-empty-i { font-size: 2.6rem; opacity: .35; display: block; margin-bottom: .7rem; }
.kg-empty-t { font-family: 'Noto Serif JP', serif; font-size: 1.05rem; font-weight: 700;
  color: var(--ink, #15161a); margin: 0 0 .35rem; }
.kg-empty-d { font-size: 13px; color: var(--ink-soft, #6b6b6b); margin: 0 0 1.1rem; }
.kg-empty-btn { font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  padding: .6rem 1.15rem; color: #fff; background: var(--kyoto-red, #be3428);
  border: none; border-radius: 9px; }
.kg-empty-btn:hover { background: #a12c22; }

.kg-back { display: inline-flex; align-items: center; gap: .45rem; margin-top: 2.6rem;
  padding: .7rem 1.15rem; font-size: 13px; font-weight: 600; text-decoration: none;
  color: var(--ink-mid, #555); background: var(--white, #fff);
  border: 1px solid var(--border-mid, #e0dcd6); border-radius: 10px; transition: .15s; }
.kg-back:hover { border-color: var(--kyoto-red, #be3428); color: var(--kyoto-red, #be3428); }

@media (max-width: 640px) {
  .kg-hero { padding: 1.6rem 1.15rem; }
  .kg-hero::after { font-size: 7.5rem; bottom: -1.6rem; }
  .kg-grid { grid-template-columns: 1fr; }
  .kg-tools { top: 56px; }
  .kg-sort, .kg-reset { flex: 1 1 auto; }
}
@media (prefers-reduced-motion: reduce) {
  .kg-card, .kg-prog-fill, .kg-group-fill { transition: none; }
  .kg-card:hover { transform: none; }
}
'''

    js = '''
(function () {
  'use strict';

  var CATALOG = {};
  try {
    CATALOG = JSON.parse(document.getElementById('kgCatalog').textContent) || {};
  } catch (e) { CATALOG = {}; }

  var search  = document.getElementById('kgSearch');
  var clearBt = document.getElementById('kgClear');
  var sortSel = document.getElementById('kgSort');
  var resetBt = document.getElementById('kgReset');
  var emptyBt = document.getElementById('kgResetEmpty');
  var empty   = document.getElementById('kgEmpty');

  var catChips = [].slice.call(document.querySelectorAll('[data-filter-cat]'));
  var lvlChips = [].slice.call(document.querySelectorAll('[data-filter-lvl]'));
  var groups   = [].slice.call(document.querySelectorAll('.kg-group'));
  var cards    = [].slice.call(document.querySelectorAll('.kg-card'));
  var TOTAL    = cards.length;

  var state = { cat: 'all', lvl: 'all', sort: 'curriculum', q: '' };
  var progress = {};

  /* KaigoProgress.getAll() sudah menangani localStorage rusak/tak tersedia
     (mengembalikan {}), jadi halaman tetap jalan tanpa progress. */
  function loadProgress() {
    try {
      if (window.KaigoProgress && typeof window.KaigoProgress.getAll === 'function') {
        return window.KaigoProgress.getAll() || {};
      }
      var raw = localStorage.getItem('np-kaigo-progress-v1');
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }

  function isDone(slug) {
    var r = progress[slug];
    return !!(r && r.completed);
  }

  function openedAt(slug) {
    var r = progress[slug];
    if (!r || !r.lastOpenedAt) return 0;
    var t = Date.parse(r.lastOpenedAt);
    return isNaN(t) ? 0 : t;
  }

  function matches(card) {
    if (state.cat !== 'all' && card.dataset.category !== state.cat) return false;
    if (state.lvl !== 'all' && card.dataset.level !== state.lvl) return false;
    if (!state.q) return true;
    var hay = card.dataset.title + ' ' + card.dataset.ja + ' ' + card.dataset.desc +
              ' ' + card.dataset.tags + ' ' + card.dataset.slug;
    return hay.indexOf(state.q) !== -1;
  }

  var SORTERS = {
    curriculum: function (a, b) { return (+a.dataset.order) - (+b.dataset.order); },
    az: function (a, b) { return a.dataset.title.localeCompare(b.dataset.title, 'id'); },
    short: function (a, b) { return (+a.dataset.duration) - (+b.dataset.duration); },
    /* PENTING: progress dikunci dengan slug ASLI (case-sensitive, mis.
       "Kaigo-N5"). data-slug sengaja di-lowercase untuk pencarian, jadi TIDAK
       boleh dipakai di sini — kalau tertukar, isDone() selalu false dan ketiga
       sorting di bawah diam-diam tidak berfungsi. Pakai data-key. */
    todo: function (a, b) {
      var da = isDone(a.dataset.key) ? 1 : 0, db = isDone(b.dataset.key) ? 1 : 0;
      return da - db || (+a.dataset.order) - (+b.dataset.order);
    },
    done: function (a, b) {
      var da = isDone(a.dataset.key) ? 0 : 1, db = isDone(b.dataset.key) ? 0 : 1;
      return da - db || (+a.dataset.order) - (+b.dataset.order);
    },
    recent: function (a, b) {
      return openedAt(b.dataset.key) - openedAt(a.dataset.key)
          || (+a.dataset.order) - (+b.dataset.order);
    }
  };

  function apply() {
    var shown = 0;
    var cmp = SORTERS[state.sort] || SORTERS.curriculum;

    groups.forEach(function (g) {
      var grid = g.querySelector('.kg-grid');
      var kids = [].slice.call(g.querySelectorAll('.kg-card'));
      var visible = 0;

      kids.forEach(function (c) {
        var show = matches(c);
        c.hidden = !show;
        if (show) visible++;
      });

      kids.filter(function (c) { return !c.hidden; })
          .sort(cmp)
          .forEach(function (c) { grid.appendChild(c); });

      g.hidden = visible === 0;
      shown += visible;
    });

    empty.classList.toggle('show', shown === 0);
    clearBt.classList.toggle('show', state.q.length > 0);
  }

  function paintProgress() {
    progress = loadProgress();

    var done = 0;
    var perCat = {};

    cards.forEach(function (card) {
      var slug = card.dataset.key;
      var cat = card.dataset.category;
      if (!perCat[cat]) perCat[cat] = { done: 0, total: 0 };
      perCat[cat].total++;

      var el = card.querySelector('[data-status]');
      if (isDone(slug)) {
        done++;
        perCat[cat].done++;
        card.classList.add('is-done');
        if (el) {
          el.classList.add('done');
          el.setAttribute('title', 'Sudah diselesaikan');
        }
      } else {
        card.classList.remove('is-done');
        if (el) el.classList.remove('done');
      }
    });

    var pct = TOTAL ? Math.round(done / TOTAL * 100) : 0;
    pct = Math.max(0, Math.min(100, pct));

    var fill = document.getElementById('kgProgFill');
    var bar  = document.getElementById('kgProgBar');
    var txt  = document.getElementById('kgProgTxt');
    var num  = document.getElementById('kgDone');
    if (fill) fill.style.width = pct + '%';
    if (bar)  bar.setAttribute('aria-valuenow', String(pct));
    if (num)  num.textContent = String(done);
    if (txt)  txt.textContent = 'Progress Kaigo: ' + done + ' dari ' + TOTAL + ' modul (' + pct + '%)';

    Object.keys(perCat).forEach(function (cat) {
      var c = perCat[cat];
      var p = c.total ? Math.round(c.done / c.total * 100) : 0;
      var f = document.querySelector('[data-catfill="' + cat + '"]');
      var t = document.querySelector('[data-catpct="' + cat + '"]');
      if (f) f.style.width = p + '%';
      if (t) t.textContent = p + '%';
    });

    paintResume(done);
  }

  /* Lanjutkan belajar:
     modul terakhir dibuka yang belum selesai → recommended_next-nya →
     modul kurikulum pertama yang belum selesai. */
  function paintResume(doneCount) {
    var box   = document.getElementById('kgResume');
    var label = document.getElementById('kgResumeLabel');
    var title = document.getElementById('kgResumeTitle');
    var go    = document.getElementById('kgResumeGo');
    if (!box || !go) return;

    var lastSlug = null, lastTime = 0;
    Object.keys(progress).forEach(function (slug) {
      if (!CATALOG[slug]) return;
      var t = openedAt(slug);
      if (t > lastTime) { lastTime = t; lastSlug = slug; }
    });

    var target = null;
    var note = 'Lanjutkan belajar';

    if (lastSlug) {
      if (!isDone(lastSlug)) {
        target = lastSlug;
      } else {
        var nxt = CATALOG[lastSlug].n;
        if (nxt && CATALOG[nxt] && !isDone(nxt)) {
          target = nxt;
          note = 'Modul berikutnya';
        }
      }
    }

    if (!target) {
      var pool = Object.keys(CATALOG).filter(function (s) { return !isDone(s); });
      pool.sort(function (a, b) {
        var ca = CATALOG[a], cb = CATALOG[b];
        return ca.c.localeCompare(cb.c) || ca.o - cb.o;
      });
      target = pool[0] || null;
      note = doneCount ? 'Modul berikutnya' : 'Mulai dari sini';
    }

    if (!target) { box.classList.remove('show'); return; }

    label.textContent = note;
    title.textContent = CATALOG[target].t;
    go.setAttribute('href', CATALOG[target].f);
    box.classList.add('show');
  }

  /* Navbar menaut kategori lewat #kg-h-<kategori>. Tanpa ini halaman hanya
     scroll tapi filter tetap "Semua" — kategori lain masih terlihat. */
  function applyHashFilter() {
    var hash = (location.hash || '').replace('#', '');
    if (hash.indexOf('kg-h-') !== 0) return false;

    var key = hash.slice(5);
    var chip = catChips.filter(function (c) { return c.dataset.filterCat === key; })[0];
    if (!chip) return false;

    state.cat = key;
    catChips.forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    return true;
  }

  function resetAll() {
    state.cat = 'all'; state.lvl = 'all'; state.sort = 'curriculum'; state.q = '';
    search.value = '';
    sortSel.value = 'curriculum';
    catChips.forEach(function (c) { c.classList.toggle('is-active', c.dataset.filterCat === 'all'); });
    lvlChips.forEach(function (c) { c.classList.toggle('is-active', c.dataset.filterLvl === 'all'); });
    apply();
  }

  search.addEventListener('input', function () {
    state.q = (search.value || '').trim().toLowerCase();
    apply();
  });

  clearBt.addEventListener('click', function () {
    search.value = ''; state.q = '';
    apply(); search.focus();
  });

  sortSel.addEventListener('change', function () {
    state.sort = sortSel.value;
    apply();
  });

  catChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.cat = chip.dataset.filterCat;
      catChips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      apply();
    });
  });

  lvlChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.lvl = chip.dataset.filterLvl;
      lvlChips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      apply();
    });
  });

  resetBt.addEventListener('click', resetAll);
  emptyBt.addEventListener('click', function () { resetAll(); search.focus(); });

  window.addEventListener('hashchange', function () {
    if (applyHashFilter()) apply();
  });

  paintProgress();
  applyHashFilter();
  apply();
})();
'''

    page = f'''<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Materi Kaigo (介護) — {total} Modul Lengkap | {BRAND}</title>
<meta name="description" content="Pusat materi Kaigo: {total} modul untuk calon 介護福祉士 — bahasa &amp; komunikasi, praktik perawatan, kesehatan lansia, dokumentasi, hukum &amp; etika, dan persiapan ujian nasional.">
<link rel="canonical" href="{BASE_URL}/Materi/Kaigo.html">

<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="Materi Kaigo (介護) — {total} Modul Lengkap">
<meta property="og:description" content="Semua modul Kaigo dalam satu tempat: bahasa, praktik perawatan, kesehatan lansia, dokumentasi, hukum, dan ujian nasional 介護福祉士.">
<meta property="og:url" content="{BASE_URL}/Materi/Kaigo.html">
<meta property="og:image" content="{BASE_URL}/assets/icon-512.svg">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Materi Kaigo (介護) — {total} Modul Lengkap">
<meta name="twitter:description" content="Pusat materi Kaigo untuk calon 介護福祉士: bahasa, praktik perawatan, kesehatan lansia, hukum, dan ujian nasional.">
<meta name="twitter:image" content="{BASE_URL}/assets/icon-512.svg">

<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#be3428">
<link rel="apple-touch-icon" href="/assets/icon-192.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600;700;900&amp;family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&amp;family=Outfit:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">

<link rel="stylesheet" href="../assets/kyoto-design-system.css">
<link rel="stylesheet" href="../assets/kyoto-theme.css">
<link rel="stylesheet" href="../assets/kyoto-navbar.css">

<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
</script>

<style>{css}</style>
</head>
<body>

<main class="kg-wrap" id="main-content">

  <nav class="kg-crumb" aria-label="Breadcrumb">
    <a href="../index.html">Beranda</a>
    <span class="kg-crumb-sep" aria-hidden="true">›</span>
    <a href="Materi.html">Materi</a>
    <span class="kg-crumb-sep" aria-hidden="true">›</span>
    <span class="kg-crumb-now" aria-current="page">Kaigo</span>
  </nav>

  <header class="kg-hero">
    <span class="kg-hero-kicker">介護福祉士 · Certified Care Worker</span>
    <h1 class="kg-hero-title">
      Materi Kaigo
      <span>介護 — Perawatan Lansia Jepang</span>
    </h1>
    <p class="kg-hero-lead">
      Semua modul Kaigo dalam satu tempat — dari bahasa dan komunikasi, praktik perawatan harian,
      kesehatan lansia, dokumentasi asuhan, hukum dan etika, hingga latihan soal ujian nasional
      介護福祉士. Disusun untuk WNI yang bekerja atau ingin bekerja di Jepang.
    </p>

    <div class="kg-hero-stats">
      <div class="kg-stat">
        <span class="kg-stat-n" id="kgTotal">{total}</span>
        <span class="kg-stat-l">Total Modul</span>
      </div>
      <div class="kg-stat">
        <span class="kg-stat-n">{len(active)}</span>
        <span class="kg-stat-l">Kategori</span>
      </div>
      <div class="kg-stat">
        <span class="kg-stat-n">{dur(total_duration())}</span>
        <span class="kg-stat-l">Total Durasi</span>
      </div>
      <div class="kg-stat">
        <span class="kg-stat-n" id="kgDone">0</span>
        <span class="kg-stat-l">Selesai</span>
      </div>
    </div>

    <div class="kg-prog">
      <div class="kg-prog-bar" role="progressbar" aria-labelledby="kgProgTxt"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="kgProgBar">
        <div class="kg-prog-fill" id="kgProgFill"></div>
      </div>
      <p class="kg-prog-txt" id="kgProgTxt">Progress Kaigo: 0 dari {total} modul</p>
    </div>
  </header>

  <aside class="kg-resume" id="kgResume">
    <span class="kg-resume-i" aria-hidden="true">▶</span>
    <span class="kg-resume-b">
      <span class="kg-resume-l" id="kgResumeLabel">Lanjutkan belajar</span>
      <span class="kg-resume-t" id="kgResumeTitle"></span>
    </span>
    <a class="kg-resume-go" id="kgResumeGo" href="Materi.html">Buka modul</a>
  </aside>

  <div class="kg-tools">
    <div class="kg-search">
      <span class="kg-search-i" aria-hidden="true">🔍</span>
      <label class="sr-only" for="kgSearch">Cari materi Kaigo</label>
      <input type="search" id="kgSearch" placeholder="Cari materi Kaigo… (mis. demensia, keigo, ujian)"
             autocomplete="off">
      <button class="kg-search-x" id="kgClear" type="button" aria-label="Bersihkan pencarian">×</button>
    </div>

    <div class="kg-row">
      <div class="kg-chips" role="group" aria-label="Filter kategori">
{NL.join(cat_chips)}
      </div>
    </div>

    <div class="kg-row">
      <div class="kg-chips" role="group" aria-label="Filter level">
{NL.join(lvl_chips)}
      </div>

      <label class="sr-only" for="kgSort">Urutkan modul</label>
      <select class="kg-sort" id="kgSort">
        <option value="curriculum">Urutan kurikulum</option>
        <option value="todo">Belum selesai</option>
        <option value="done">Sudah selesai</option>
        <option value="recent">Terakhir dibuka</option>
        <option value="az">A–Z</option>
        <option value="short">Durasi terpendek</option>
      </select>

      <button class="kg-reset" id="kgReset" type="button">Reset</button>
    </div>
  </div>

  <div id="kgResults">
{NL.join(sections)}
  </div>

  <div class="kg-empty" id="kgEmpty">
    <span class="kg-empty-i" aria-hidden="true">🔍</span>
    <p class="kg-empty-t">Materi tidak ditemukan</p>
    <p class="kg-empty-d">Coba kata kunci lain, ubah filter, atau tampilkan semua modul.</p>
    <button class="kg-empty-btn" type="button" id="kgResetEmpty">Tampilkan semua modul</button>
  </div>

  <a class="kg-back" href="Materi.html">
    <span aria-hidden="true">←</span> Kembali ke Semua Materi
  </a>

</main>

<script src="../assets/kaigo-progress.js" defer></script>
<script src="../assets/kyoto-theme.js" defer></script>
<script src="../assets/kyoto-navbar.min.js?v=20260623" defer></script>

<script id="kgCatalog" type="application/json">{json.dumps(catalog_js, ensure_ascii=False)}</script>

<script>{js}</script>

<script>
if ('serviceWorker' in navigator) {{
  window.addEventListener('load', function () {{
    navigator.serviceWorker.register('/sw.js').catch(function () {{}});
  }});
}}
</script>

<script src="../assets/anime-theme.js" defer></script>
</body>
</html>
'''

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(page)

    print(f'✅ Materi/Kaigo.html — {total} modul, {dur(total_duration())}')
    for key, name, icon, _ in active:
        print(f'   {icon} {name}: {len(modules_in(key))} modul · {dur(total_duration(key))}')
    return total


if __name__ == '__main__':
    build()
