#!/usr/bin/env python3
"""P5.1 — flavor atlas aggregate extractor (PRIVATE input / AGGREGATE output, stdlib only).

Reads the owner's order workbook (data/private/food_delivery_orders_extracted(2).xlsx,
sheet Food_Orders) and writes AGGREGATES ONLY to context/generated/flavor-atlas-v1.json:
category counts, month distribution, service distribution, description-confidence
distribution, and SUPPRESSED item frequencies (< min-support merged into a bucket —
no rare personal patterns leak). NO per-row content, NO identifiers, NO raw item strings
below the support floor. Re-run is idempotent; --selfcheck validates totals and the
support floor by recomputation.
"""
from pathlib import Path
import datetime
import json
import re
import sys
import zipfile
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / 'data/private/food_delivery_orders_extracted(2).xlsx'
OUT = ROOT / 'context/generated/flavor-atlas-v1.json'
MIN_SUPPORT = 3


def read_sheet_rows(sheet_xml: str):
    for row in re.findall(r'<x:row[^>]*>(.*?)</x:row>', sheet_xml, re.S):
        out = []
        for m in re.finditer(r'<x:c[^>]*?/?>((?:(?!<x:c[ >]).)*?)</x:c>', row, re.S):
            v = re.search(r'<x:v>(.*?)</x:v>', m.group(0), re.S)
            out.append(v.group(1) if v else '')
        yield out


def main() -> int:
    z = zipfile.ZipFile(XLSX)
    wb = z.read('xl/workbook.xml').decode('utf8', 'ignore')
    names = re.findall(r'<x:sheet name="([^"]+)"', wb)
    idx = names.index('Food_Orders') + 1
    rows = list(read_sheet_rows(z.read(f'xl/worksheets/sheet{idx}.xml').decode('utf8', 'ignore')))
    header = rows[0]
    col = {name: i for i, name in enumerate(header)}

    def get(cells, name):
        return cells[col[name]] if col.get(name, -1) < len(cells) else ''

    items = 0
    cat_counts, month_counts, service_counts, conf_counts = Counter(), Counter(), Counter(), Counter()
    item_counts = Counter()
    for cells in rows[1:]:
        if len(cells) < len(header):
            cells = cells + [''] * (len(header) - len(cells))
        date = (get(cells, 'datetime_lima') or '')[:7]
        cat = get(cells, 'inferred_category').strip()
        item = get(cells, 'food_item').strip()
        service = get(cells, 'service').strip()
        conf = get(cells, 'description_confidence').strip() or 'unknown'
        if not item:
            continue
        items += 1
        cat_counts[cat or 'uncategorized'] += 1
        if date:
            month_counts[date] += 1
        service_counts[service or 'unknown'] += 1
        conf_counts[conf] += 1
        item_counts[item] += 1

    supported = {}
    suppressed_total = 0
    for item, n in item_counts.most_common():
        if n >= MIN_SUPPORT:
            supported[item] = n
        else:
            suppressed_total += n
    # AGGREGATED pair table (item,category) -> count, support-floored: no row data
    supported_set = set(supported)
    pair_counts = Counter()
    for cells in rows[1:]:
        if len(cells) < len(header):
            cells = cells + [''] * (len(header) - len(cells))
        item = get(cells, 'food_item').strip()
        cat = get(cells, 'inferred_category').strip() or 'uncategorized'
        if item in supported_set:
            pair_counts[(item, cat)] += 1
    item_categories = {item: dict(Counter({cat: n for (it, cat), n in pair_counts.items() if it == item}).most_common())
                       for item in supported}

    doc = {
        'schema': 'flavor-atlas/v1',
        'generated_at': datetime.datetime.now(datetime.UTC).isoformat(),
        'aggregate_only': True,
        'policy': 'AGGREGATES ONLY: no identifiers, no raw rows, no item strings below support floor. Derived from the private workbook; NOT publishable per AGENTS.md without owner approval.',
        'items': items,
        'category_counts': dict(cat_counts.most_common()),
        'month_counts': dict(sorted(month_counts.items())),
        'service_counts': dict(service_counts.most_common()),
        'description_confidence_counts': dict(conf_counts.most_common()),
        'supported_item_counts': supported,
        'supported_item_categories': item_categories,
        'suppressed_item_total': suppressed_total,
        'suppressed_item_bucket_count': sum(1 for n in item_counts.values() if n < MIN_SUPPORT),
        'min_support': MIN_SUPPORT,
    }

    if '--selfcheck' in sys.argv:
        assert sum(doc['category_counts'].values()) == items, 'category totals must equal items'
        assert sum(doc['supported_item_counts'].values()) + doc['suppressed_item_total'] == items, 'item totals must equal items'
        assert all(n >= MIN_SUPPORT for n in doc['supported_item_counts'].values()), 'support floor violated'
        for item, cats in doc['supported_item_categories'].items():
            assert sum(cats.values()) == doc['supported_item_counts'][item], f'pair totals wrong for {item}'
        assert all(n != 0 for n in doc['month_counts'].values())

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(f'items={items} categories={len(cat_counts)} supported_items={len(supported)} suppressed_items={doc["suppressed_item_bucket_count"]} (rows suppressed={suppressed_total})')
    print(f'wrote {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
