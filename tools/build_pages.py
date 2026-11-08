#!/usr/bin/env python3
"""Regenerate the empty, sheet-driven shells: packages.html, package.html, apps.html, projects.html, project.html.
All data comes from the Google Sheet at runtime (js/sheet.js). Run after changing nav/footer in index.html."""
import re,os
from html import escape as E
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
SITE='https://psbmlabs.github.io/'
idx=open('index.html',encoding='utf-8').read()
head=idx[:idx.find('<!-- ============ HERO')].replace('class="nav-link active"','class="nav-link"')
foot=re.sub(r'<script type="application/ld\+json">.*?</script>\n','',idx[idx.find('<!-- ============ FOOTER'):],flags=re.S)
WAVE=re.search(r'<div class="waves".*?</svg></div>',idx,re.S).group(0)
LOAD='<div class="col-12 text-center" style="padding:3rem 0;color:var(--text-faint)">Loading…</div>'
def shell(title,desc,url,nav,body,canon=True):
    h=re.sub(r'<title>.*?</title>',f'<title>{E(title)}</title>',head,flags=re.S)
    h=re.sub(r'(<meta name="description" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    for k in ['og:title','twitter:title']:h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(title,True),h)
    for k in ['og:description','twitter:description']:h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    h=h.replace('<link rel="canonical" href="https://psbmlabs.github.io/">',f'<link rel="canonical" href="{SITE}{url}">' if canon else '')
    h=h.replace(f'<a class="nav-link" href="{nav}">',f'<a class="nav-link active" href="{nav}">',1)
    open(url,'w',encoding='utf-8').write(h+body+foot)
HERO=lambda eb,h1,lead,extra='',ids=('','',''):f'<div class="app-hero">{WAVE}<div class="container-xl" style="position:relative;z-index:1"><div class="eyebrow"><span class="dot"></span> <span id="{ids[0]}">{eb}</span></div><h1 id="{ids[1]}">{h1}</h1><p class="lead-spl" id="{ids[2]}" style="max-width:66ch">{lead}</p>{extra}</div></div>'
CTA=lambda a,b:f'<section id="cta" style="padding-bottom:5rem"><div class="container-xl"><div class="cta-banner reveal"><h3>{a}</h3><p>{b}</p><a href="contact.html" class="btn btn-spl-primary">Start a conversation</a></div></div></section>'
# packages
chips=''.join(f'<button data-f="{k}"{" class=on" if k=="all" else ""}>{v}</button>' for k,v in [('all','All'),('stable','Stable'),('beta','Beta'),('planned','Planned')])
filt='''<script>(function(){var s=window.pkState={f:'all',q:'',n:0};function go(){s.n=1;window.pkRender&&window.pkRender()}document.querySelectorAll('#pkSeg button').forEach(function(x){x.onclick=function(){document.querySelectorAll('#pkSeg button').forEach(function(y){y.className=''});x.className='on';s.f=x.dataset.f;go()}});document.getElementById('pkQ').oninput=function(){s.q=this.value.toLowerCase().trim();go()}})();</script>'''
shell('Open-Source Flutter Packages & Developer Tools | PSBM Labs','Open-source Flutter packages by PSBM Labs — install guides, code samples and GitHub links.','packages.html','packages.html',
 HERO('OPEN SOURCE · BY PSBM LABS','Packages &amp; developer tools','Open-source Flutter packages we build for our own apps and share with the community.')+
 f'<section><div class="container-xl"><div class="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4"><div class="seg" id="pkSeg" style="margin:0">{chips}</div><input id="pkQ" type="search" placeholder="Search packages…" class="form-control" style="max-width:280px;border-radius:99px"></div><div class="row g-4" id="pkGrid">{LOAD}</div></div></section>'+CTA('Need a custom package or integration?','We build reusable Flutter and backend modules for teams — tell us what you need.')+filt)
shell('Package — PSBM Labs','Open-source Flutter package by PSBM Labs.','package.html','packages.html',
 HERO('FLUTTER PACKAGE','Loading…','','<div class="mt-3" id="pdActions"></div>',('','pdName','pdSummary'))+f'<div id="pkgDetail"><section><div class="container-xl">Loading…</div></section></div>'+CTA('Need this built for you?','We integrate and ship it.'),False)
# apps
shell('Download Apps — PSBM Labs','Download PSBM Labs Android apps from Google Play or as a direct APK.','apps.html','apps.html',
 HERO('APP DOWNLOADS','Download PSBM Labs apps','Install from Google Play, or download the APK directly to try the latest builds before they reach the store.')+
 f'<section><div class="container-xl"><div class="row g-4" id="appGrid">{LOAD}</div><div class="row g-4 mt-2"><div class="col-lg-6 reveal"><div class="notice"><strong>Direct APK = official PSBM Labs build.</strong> Only download APKs from this page. Android may show a warning for apps installed outside Google Play — that is normal for direct installs.</div></div><div class="col-lg-6 reveal"><h3 style="font-size:1.05rem;font-weight:700">How to install an APK</h3><ol class="steps-mini"><li>Tap “Direct APK” and let the file download.</li><li>Open it and allow “Install unknown apps” for your browser when asked.</li><li>Tap Install, then open the app.</li></ol></div></div></div></section>'+CTA('Want an app like these for your business?','We design, build, publish and maintain it end to end.'))
# projects
shell('Projects & Case Studies — PSBM Labs','Apps and platforms PSBM Labs has designed, built and shipped — with problem, solution, tech stack and results.','projects.html','projects.html',
 HERO('OUR WORK','Selected projects &amp; case studies','Apps and platforms we have designed, built and shipped for businesses in Bangladesh.')+
 f'<section><div class="container-xl"><div class="seg" id="prSeg"></div><div class="row g-4" id="prGrid">{LOAD}</div></div></section>'+CTA('Building something similar?','Tell us what you are building — we reply within one business day.'))
shell('Case Study — PSBM Labs','Case study by PSBM Labs.','project.html','projects.html',
 HERO('CASE STUDY','Loading…','','<div class="mt-3"><a class="btn btn-spl-ghost" href="projects.html" style="color:#fff">← All projects</a></div>',('prCat','prTitle','prSummary'))+'<div id="prDetail"><section><div class="container-xl">Loading…</div></section></div>'+CTA('Building something similar?','Tell us what you are building — we reply within one business day.'),False)
print('pages built')
