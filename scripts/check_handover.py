#!/usr/bin/env python3
"""Deterministic safety and handover smoke checks; stdlib only.
This is not a full recipe audit or browser test; it deliberately reports scope.
"""
from pathlib import Path
import json
import re
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
errors = []
def check(condition, label):
    print(('PASS' if condition else 'FAIL') + ': ' + label)
    if not condition:
        errors.append(label)

needed = [
    'AGENTS.md','OPEN_CODE_HANDOVER.md','README_OPEN_CODE.md','docs/MODEL_RESEARCH.md',
    'docs/IMPLEMENTATION_ROADMAP.md','docs/DATA_CONTRACT.md','docs/FOOD_SCIENCE_VALIDATION.md',
    'docs/UX_DESIGN_SYSTEM.md','docs/RETAIL_MATCHING.md','docs/QA_RELEASE.md',
    'docs/PROGRESS.md','docs/DECISIONS_AND_UNKNOWNS.md','context/README.md',
    '.opencode/skills/solarize-fallback/SKILL.md','.opencode/commands/kickoff.md',
    'index.html','assets/js/app.js','assets/js/data.js','tests/nutrition-core.test.cjs',
    'data/private/food_delivery_orders_extracted(2).xlsx',
    'data/private/dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf',
]
for x in needed: check((root/x).is_file(), 'file '+x)
ignores = (root/'.gitignore').read_text('utf8') if (root/'.gitignore').is_file() else ''
check(bool(ignores), '.gitignore exists')
for pattern in ('data/private/', 'context/private/', '.env'):
    check(pattern in ignores, 'gitignore protection '+pattern)
skill_text = (root/'.opencode/skills/solarize-fallback/SKILL.md').read_text('utf8') \
    if (root/'.opencode/skills/solarize-fallback/SKILL.md').is_file() else ''
check(skill_text.startswith('---\n'), 'fallback skill YAML frontmatter')
for name in ['meal-plan-data.json','nutrition-reviewed.json']:
    try:
        data = json.loads((root/name).read_text('utf8'))
        check(isinstance(data, dict), 'valid '+name)
    except (OSError, ValueError) as exc:
        check(False,'parse '+name+' '+str(exc))
# Only check obvious public leaks. Inputs/private in archive are excluded from git and intended for local owner.
for path in (root/'assets').rglob('*'):
    if path.suffix.lower() not in ('.js','.json','.html','.css','.svg'):continue
    content = path.read_text('utf8',errors='replace')
    check('food_delivery_orders_extracted(2).xlsx' not in content, 'no raw workbook reference in '+str(path.relative_to(root)))
print('\n' + ('ALL CHECKS PASS' if not errors else f'{len(errors)} CHECKS FAILED'))
sys.exit(1 if errors else 0)
