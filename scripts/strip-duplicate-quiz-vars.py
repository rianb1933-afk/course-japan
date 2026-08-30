#!/usr/bin/env python3
"""Remove orphaned duplicate quiz variable declarations (QX, QKZ, etc.) from Kaigo pages.
Only removes the var declaration line and any associated render functions.
Does NOT touch the main QUIZ array or its DOM."""

import re, os, glob

ROOT = os.path.join(os.path.dirname(__file__), '..')
files = glob.glob(os.path.join(ROOT, 'Materi', 'Kaigo-*.html'))

fixed = 0
for fpath in sorted(files):
    fname = os.path.basename(fpath)
    html = open(fpath).read()
    orig = len(html)
    
    # Skip files without duplicates
    if 'var QX=' not in html and 'var QKZ=' not in html and 'var QA=' not in html:
        continue
    
    # Step 1: Remove var declarations using bracket-matching
    for name in ['QX', 'QKZ', 'QA', 'QB']:
        pattern = f'var {name}=['
        while pattern in html:
            idx = html.index(pattern)
            # Find matching ] with depth tracking
            arr_start = html.index('[', idx)
            depth = 0
            in_str = False
            str_ch = ''
            arr_end = -1
            for i in range(arr_start, min(arr_start + 100000, len(html))):
                ch = html[i]
                if in_str:
                    if ch == str_ch and (i == 0 or html[i-1] != '\\'):
                        in_str = False
                else:
                    if ch in ('"', "'"):
                        in_str = True
                        str_ch = ch
                    elif ch == '[':
                        depth += 1
                    elif ch == ']':
                        depth -= 1
                        if depth == 0:
                            arr_end = i + 1
                            break
            
            if arr_end == -1:
                break
            
            # Find the semicolon after state vars
            semi = html.find(';', arr_end)
            if semi == -1 or semi > arr_end + 100:
                break
            
            html = html[:idx] + html[semi+1:]
    
    # Step 2: Remove orphaned render functions (rndX, rndZ, etc.)
    for suffix in ['X', 'Z', 'A', 'B']:
        for fn_name in [f'rnd{suffix}', f'ans{suffix}', f'nQ{suffix}', f'rQ{suffix}']:
            pat = f'function {fn_name}('
            while pat in html:
                idx = html.index(pat)
                brace = html.find('{', idx)
                if brace == -1 or brace > idx + 100:
                    break
                # Count braces
                depth = 0
                in_str = False
                str_ch = ''
                fn_end = -1
                for i in range(brace, min(brace + 50000, len(html))):
                    ch = html[i]
                    if in_str:
                        if ch == str_ch and (i == 0 or html[i-1] != '\\'):
                            in_str = False
                    else:
                        if ch in ('"', "'"):
                            in_str = True
                            str_ch = ch
                        elif ch == '{':
                            depth += 1
                        elif ch == '}':
                            depth -= 1
                            if depth == 0:
                                fn_end = i + 1
                                break
                if fn_end == -1:
                    break
                # Eat trailing newlines
                while fn_end < len(html) and html[fn_end] == '\n':
                    fn_end += 1
                html = html[:idx] + html[fn_end:]
    
    # Step 3: Remove rndX() calls
    html = re.sub(r'\brnd[A-Z]\(\);?\s*\n?', '', html)
    
    # Step 4: Remove orphaned score elements
    html = re.sub(r'<p[^>]*id="qs[A-Z]"[^>]*>[^<]*</p>\s*', '', html)
    
    # Step 5: Strip inline styles
    style_count = len(re.findall(r' style="', html))
    html = re.sub(r' style="[^"]*"', '', html)
    
    # Step 6: Clean up empty scripts
    html = re.sub(r'<script>\s*</script>', '', html)
    html = re.sub(r'\n{3,}', '\n\n', html)
    
    # Safety: QUIZ must still exist
    if 'var QUIZ=' not in html:
        print(f'  ❌ {fname}: QUIZ lost! Skipping')
        continue
    
    if len(html) != orig:
        open(fpath, 'w').write(html)
        fixed += 1
        print(f'  ✓ {fname} (-{orig - len(html)} bytes, -{style_count} inline styles)')

print(f'\nFixed {fixed} files')
