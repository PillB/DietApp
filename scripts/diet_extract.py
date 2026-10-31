#!/usr/bin/env python3
"""Diet reference extraction (private-to-private, stdlib only).

Inputs:
- data/private/weekly diet.xlsx (sheet 'plan 1'; layout: A column holds slot
  markers de/SAYU/NO (desayuno rows), AL/MU/ER/ZO (almuerzo), RE/FRI/GE/CE
  (refrigerio), CE/NA (cena); columns B..H = days; column I = notes/recipes/brands)
Outputs (PRIVATE, gitignored under data/private/):
- data/private/extraction-summaries/weekly-diet-structured.json  → slot-based grid
- data/private/extraction-summaries/recipes-libre-structured.json → docx recipes
Author identity / phone are REDACTED to abide by the standing owner instruction
("do not reference Pablo Illescas in the code" — and no third-party identity at all
inside the app; only "professional nutritionist (identity withheld)").
"""
from pathlib import Path
import datetime
import json
import re
import zipfile
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / 'data/private/weekly diet.xlsx'
DOCX = ROOT / 'data/private/RECETAS- LIBRE.docx'
OUT = ROOT / 'data/private/extraction-summaries'
OUT.mkdir(parents=True, exist_ok=True)

DAY_HEADERS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']
SLOT_MARKERS = {
    'DESEE': None,  # not used
    'DESAYUNO': ('DE', 'SAYU', 'NO'),
    '11am': ('11am',),
    'ALMUERZO': ('AL', 'MU', 'ER', 'ZO'),
    'REFRIGERIO': ('RE', 'FRI', 'GE', 'CE'),
    'CENA': ('CE', 'NA'),
}
META_MARKERS = set(DAY_HEADERS) | {'PLANIFICACIÓN ALIMENTARIA'}
IDENTITY_PATTERNS = [re.compile(r'[Nn]athaly\s+\w+'), re.compile(r'CNP\s*\d+'), re.compile(r'\b9\d{7}\b')]


def strip_identity(text):
    for pattern in IDENTITY_PATTERNS:
        text = pattern.sub('[identity withheld]', text)
    return text


def clean(s):
    return strip_identity(s.strip())


def slot_from_marker(marker: str):
    for slot, parts in SLOT_MARKERS.items():
        if parts and marker in parts:
            return slot
    return None


def extract_week():
    z = zipfile.ZipFile(XLSX)
    ss_xml = z.read('xl/sharedStrings.xml').decode('utf8', 'ignore')
    strings = [re.sub(r'<[^>]+>', '', s) for s in re.findall(r'<si>(.*?)</si>', ss_xml, re.S)]
    sheet = z.read('xl/worksheets/sheet1.xml').decode('utf8', 'ignore')
    rows = re.findall(r'<row[^>]*?>(?:(?!<row).)*</row>', sheet, re.S)
    grid = []
    for rr in rows:
        m = re.search(r'<row[^>]*r="(\d+)"', rr)
        if not m:
            continue
        rnum = int(m.group(1))
        cells = {}
        for cm in re.finditer(r'<c\sr="([A-Z]+)(\d+)"([^>]*?)(?:/>|>(.*?)</c>)', rr, re.S):
            col, _r2, attrs, body = cm.group(1), cm.group(2), cm.group(3) or '', cm.group(4) or ''
            v = re.search(r'<v>(.*?)</v>', body, re.S)
            val = v.group(1) if v else ''
            if re.search(r't="s"', attrs) and val.isdigit():
                val = strings[int(val)]
            val = clean(val)
            if val and not (val.isdigit() and len(val) <= 3):  # drop pure-number noise
                cells[col] = val
        if cells:
            grid.append((rnum, cells))
    return grid


def into_slots(grid):
    week = {d: {slot: [] for slot in SLOT_MARKERS} for d in DAY_HEADERS}
    notes = []
    current = None  # partial slot tracker
    marker_to_slot = {}
    for marker_row, cells in grid:
        if 'I' in cells and marker_row in (1, 19, 23, 42, 47, 58, 71, 82, 111, 112):
            continue  # note cells handled separately below
        marker = strip_identity(cells.get('A', ''))
        if marker in DAY_HEADERS:
            continue
        slot = slot_from_marker(marker)
        if slot:
            current = slot
            # NOTE: marker rows may also carry the first line of items — do not skip.
        elif marker in ('11am',):
            current = '11am'
        for col in 'BCDEFGH':
            if col in cells and current:
                day = DAY_HEADERS['BCDEFGH'.index(col)]
                week[day][current].append(cells[col])
        for key in ('I',):
            if key in cells and 'ARN' not in cells[key]:
                notes.append(clean(cells[key]))
    return week, notes


def extract_docx():
    z = zipfile.ZipFile(DOCX)
    xml = z.read('word/document.xml').decode('utf8', 'ignore')
    text = re.sub(r'<w:p[ >]', '\n<w:p ', xml)
    text = re.sub(r'<[^>]+>', '', text)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    recipes = []
    current = None
    phase = None
    for line in lines:
        l2 = strip_identity(line)
        # recipe header: junk digits may be glued at the start; name then '- N porción(es)'
        m = re.match(r'^\s*(?:\d+)?\s*(.+?)\s*-\s*(\d+)\s*porci\w*$', l2, re.I)
        if m:
            name = re.sub(r'^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+', '', m.group(1)).strip()
            current = {'name': clean(name), 'ingredients': [], 'steps': [], 'servings': int(m.group(2))}
            phase = None
            recipes.append(current)
            continue
        if current is None:
            continue
        # phase markers may arrive with glued junk prefixes
        if re.search(r'Ingredientes', l2, re.I) and not re.search(r'Preparaci', l2, re.I):
            phase = 'ingredients'
            continue
        if re.search(r'Preparaci', l2, re.I):
            phase = 'steps'
            continue
        if phase == 'ingredients':
            current['ingredients'].append(l2)
        elif phase == 'steps':
            current['steps'].append(l2)
    return recipes


def main():
    grid = extract_week()
    week, notes = into_slots(grid)
    docs = {'schema': 'diet-reference/v1', 'source': 'nutritionist workbook/docx (PRIVATE derivatives; identity withheld)', 'week': week, 'notes_and_recipes_from_sheet': notes}
    (OUT / 'weekly-diet-structured.json').write_text(json.dumps(docs, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    recipes = extract_docx()
    (OUT / 'recipes-libre-structured.json').write_text(json.dumps({'schema': 'diet-reference/v1', 'source': 'docx (PRIVATE derivative; identity withheld)', 'recipes': recipes}, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    # selfcheck
    for day, slots in week.items():
        for slot in ('DESAYUNO', 'ALMUERZO', 'REFRIGERIO', 'CENA'):
            assert slots[slot] or slot == 'REFRIGERIO' or day == 'LUNES', f'{day}/{slot} unexpectedly empty: {slots[slot]}'
    assert any('muesli' in ' '.join(v).lower() for d in week.values() for v in d.values()), 'muesli breakfast must appear'
    assert recipes and all(r['ingredients'] for r in recipes), 'docx recipes must extract'
    print(f'days={len(week)} slot_totals=', {s: sum(len(week[d][s]) for d in week) for s in SLOT_MARKERS if SLOT_MARKERS[s]})
    print(f'docx recipes: {[r["name"] for r in recipes]}')
    print(f'notes: {len(notes)}')


if __name__ == '__main__':
    main()
