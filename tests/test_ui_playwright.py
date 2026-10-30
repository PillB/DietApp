"""Chromium smoke/interaction checks for the independent nutrition panel.

This sandbox blocks browser navigation via administrator policy. Thus we use
Playwright's set_content and inject *local* JS/CSS, testing our own controls
without falsely claiming remote Tailwind/Alpine CDN integration was tested.
For full deployment integration, run this project's unit tests and then open
index.html normally in a browser with CDN access.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent


def run(viewport,suffix):
    html=(ROOT/'index.html').read_text()
    # Remove remote/runtime script tags and Alpine cloaks; inject only the
    # nutrition section by selecting it from HTML via BeautifulSoup.
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser')
    panel=soup.find(id='nutrition-root')
    assert panel is not None
    panel.attrs.pop('x-cloak',None)
    panel.attrs.pop('x-show',None)
    css=(ROOT/'assets/css/tailwind.css').read_text()
    markup=f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{{margin:0;background:#101419;color:white;font-family:Arial}}main{{padding:20px;max-width:1160px;margin:auto}}{css}</style></head><body><main>{panel}</main></body></html>'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport=viewport)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(markup)
        page.add_script_tag(content=(ROOT/'assets/js/nutrition-data.js').read_text())
        page.add_script_tag(content=(ROOT/'assets/js/nutrition-core.js').read_text())
        page.add_script_tag(content=(ROOT/'assets/js/nutrition-ui.js').read_text())
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        assert page.locator('#n-schedule-list .n-event').count()==7, f"count={page.locator('#n-schedule-list .n-event').count()} err={errors} snippet={page.locator('#n-notice').inner_text()}"
        assert page.locator('#n-shopping-list li').count()>=20
        assert not errors,errors
        page.locator('#n-age').fill('35')
        page.locator('#n-weight').fill('80')
        page.locator('#n-height').fill('170')
        page.locator('#n-physiology').select_option('male')
        page.locator('#n-energy-form button').click()
        assert 'Maintenance kcal/d' in page.locator('#n-energy-result').inner_text()
        page.locator('#n-language').select_option('es')
        assert 'Nutrición' in page.locator('#nutrition-root h2').inner_text()
        page.locator('#n-language').select_option('en')
        # Date-range quantity recalculation with the two half-plus-two-onion recipes.
        page.locator('#n-reset').click()
        assert page.locator('#n-shopping-list li').count()==0
        for day,recipe in [('2026-11-02','aji-chicken-tacos'),('2026-11-03','chifa-lomo-quinoa')]:
            page.locator('#n-recipe').select_option(recipe)
            page.locator('#n-date').fill(day)
            page.locator('#n-portions').fill('4')
            page.locator('#n-assign-form button').click()
        assert '2.5 each' in page.locator('#n-shopping-list').inner_text()
        assert page.locator('#n-schedule-list .n-event').count()==2
        # Check sideways overflow relative to viewport under each breakpoint.
        overflow=page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        assert not overflow,f'{suffix} has horizontal overflow'
        page.screenshot(path=str(ROOT/'tests'/f'nutrition_{suffix}.png'),full_page=True)
        print('PASS',suffix,'errors',errors,'meals',page.locator('#n-schedule-list .n-event').count(),'shopping',page.locator('#n-shopping-list li').count(),'overflow',overflow)
        browser.close()

if __name__=='__main__':
    for viewport,suffix in [({'width':1360,'height':900},'desktop'),({'width':390,'height':844},'mobile')]:run(viewport,suffix)
