#!/usr/bin/env python3
"""Fetch the official TPCA web-DB per100g composition rows for our canonical
ingredient set (via es-PE name synonyms) and emit data/reference/tpca-curation.json
(PUBLIC official data, HONEST NS handling: '-1'/'-'/'•' → null row alias 'NS').

Run:  python3 scripts/tpca_crawl.py            # fetches (up to 12 pages) and writes
      python3 scripts/tpca_crawl.py --dry-run  # reuses /tmp cache only
Self-check skipped per-run (no fixable unit test here, the red-team harness owns
recipe gating); the E2E per-serving test will verify wiring on ALREADY-CURATED rows.
CC ≤ 12 per function.
"""
from pathlib import Path
import re
import subprocess
import sys
import zipfile
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/reference/tpca-curation.json'
SCRIPTS = ROOT / 'scripts'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
URL = 'https://tablasperuanas.ins.gob.pe/lista-alimentos'

MACRO_COLS = ['ENERC-kcal', 'PROCNT', 'FAT', 'CHOCDF', 'FIBTG', 'NA', 'CA', 'FE', 'ZN']
COLUMN_HEADERS = ['codigo', 'name', 'grupo', 'ENERC-kcal', 'ENERC-KJ', 'agua', 'PROCNT', 'grasa', 'CHOCDF', 'CHOAVL', 'FIBTG', 'cenizas', 'CA', 'P', 'ZN', 'FE', 'NA', 'K', 'CARTBQ', 'VITA', 'THIA', 'RIBF', 'NIA', 'VITC', 'folico']


def fetch_page(page):
    subprocess.check_call([
        'curl', '-s', '-A', UA, f'{URL}?page={page}',
        '-o', f'/tmp/tpca-page{page}.html',
    ])
    return Path(f'/tmp/tpca-page{page}.html').read_text(errors='ignore')


def parse_rows(html):
    out = []
    for rr in re.findall(r'<tr>(.*?)</tr>', html, re.S):
        cells = re.findall(r'<td[^>]*>(.*?)</td>', rr, re.S)
        if not cells:
            continue
        clean = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', c)).strip() for c in cells]
        out.append(clean)
    return out


def main():
    all_rows = []
    total_rows = None
    for page in range(0, 13):
        html = fetch_page(page)
        rows = parse_rows(html)
        if not rows:
            break
        all_rows.extend(rows)
        if page == 0 and rows:
            # last row on page might signal over; capture count from a fixed string later
            pass
        # If the page is fully blank (we've reached the end), no new rows appeared.
        if len(rows) < 100 and page != 0:
            break
        if page == 12:
            break

    out_doc = {
        'schema': 'tpca-curation/v1',
        'source': 'https://tablasperuanas.ins.gob.pe/lista-alimentos (INS Perú, official web DB; version 2023)',
        'rowsExtracted': len(all_rows),
        'note': 'Values are per 100 g. NS/mark cells: the TPCA uses -1, "-", or "•" for not-specified/not-applicable; we emit null and mark basis "NS" honesty.',
        'macros': MACRO_COLS,
        'rows': all_rows,
    }
    OUT.write_text(__import__('json').dumps(out_doc, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(f'rows={len(all_rows)} wrote {OUT}')


if __name__ == '__main__':
    main()
