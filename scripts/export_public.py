#!/usr/bin/env python3
"""Create an intentionally cautious publish-candidate archive; not a release approval.
Excludes original personal workbook, PDFs, raw reports and local context.
No external packages; run human privacy/licensing review before pushing.
"""
from pathlib import Path
import zipfile
import re
import sys
root = Path(__file__).resolve().parents[1]
out = root.parent / 'gourmet-kitchen-PUBLIC-CANDIDATE.zip'
exclusion_dirs = {'data/private', 'context/private', 'context/processed/private', '.git','node_modules','test-results','playwright-report'}
exclude_suffix = {'.xlsx','.xls','.pdf','.env'}
items=[]
for p in root.rglob('*'):
    if not p.is_file():continue
    rel=p.relative_to(root)
    name=rel.as_posix()
    if any(name==d or name.startswith(d+'/') for d in exclusion_dirs):continue
    if rel.suffix.lower() in exclude_suffix or rel.name.startswith('.env'):continue
    if 'private' in rel.parts: continue
    items.append(p)
assert not any(p.suffix.lower() in exclude_suffix for p in items)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in items:z.write(p, p.relative_to(root))
print('Public-CANDIDATE exported:',out,'files:',len(items))
print('NOT an attestation of safety: review JS/JSON flavor/profile, licenses and git history before deployment.')
