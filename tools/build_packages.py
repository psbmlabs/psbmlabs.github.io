#!/usr/bin/env python3
"""Rebuild packages.html + packages/<slug>.html from data/packages/*.json.
Usage (from repo root):  python3 tools/build_packages.py"""
import json,glob,os,re,html
from html import escape as E
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
SITE='https://psbmlabs.github.io/'
idx=open('index.html',encoding='utf-8').read()
head=idx[:idx.find('<!-- ============ HERO')].replace('class="nav-link active"','class="nav-link"')
head=head.replace(' data-bn="ready"','')
foot=re.sub(r'<script type="application/ld\+json">.*?</script>\n','',idx[idx.find('<!-- ============ FOOTER'):],flags=re.S)
WAVE=re.search(r'<div class="waves".*?</svg></div>',idx,re.S).group(0)
def up(s): return re.sub(r'(href|src)="(?!https?:|#|mailto:|tel:|/|\.\./)([^"]+)"',r'\1="../\2"',s)
def shell(title,desc,url,body,ld,deep):
    h=re.sub(r'<title>.*?</title>',f'<title>{E(title)}</title>',head,flags=re.S)
    h=re.sub(r'(<meta name="description" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    for k in ['og:title','twitter:title']: h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(title,True),h)
    for k in ['og:description','twitter:description']: h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    h=h.replace('<link rel="canonical" href="https://psbmlabs.github.io/">',f'<link rel="canonical" href="{SITE}{url}">')
    h=h.replace('<a class="nav-link" href="packages.html">','<a class="nav-link active" href="packages.html">',1)
    out=h+body+ld+foot
    return up(out) if deep else out
HERO=lambda eb,h1,lead,extra='':f'<div class="app-hero">{WAVE}<div class="container-xl" style="position:relative;z-index:1"><div class="eyebrow"><span class="dot"></span> {eb}</div><h1>{h1}</h1><p class="lead-spl" style="max-width:66ch">{lead}</p>{extra}</div></div>'
CTA=lambda a,b:f'<section id="cta" style="padding-bottom:5rem"><div class="container-xl"><div class="cta-banner reveal"><h3>{a}</h3><p>{b}</p><a href="contact.html" class="btn btn-spl-primary">Start a conversation</a></div></div></section>'
ST={'stable':('Stable','#eceeff','#4338ca'),'beta':('Beta','#fff4e0','#7a5200'),'planned':('Planned','#eef2f7','#4d5d78')}
pk=[]
for f in sorted(glob.glob('data/packages/*.json')):
    if os.path.basename(f).startswith('_'):continue
    pk.append(json.load(open(f,encoding='utf-8')))
pk.sort(key=lambda p:(p.get('order',99),p['name']))
for f in glob.glob('packages/*.html'):os.remove(f)
def badge(p):
    l,bg,fg=ST[p['status']];return f'<span style="background:{bg};color:{fg}">{l}</span>'
# ---- detail pages
for p in pk:
    if p['status']=='planned':continue
    B=HERO(f"{p['platform'].upper()} PACKAGE · {p['license']} LICENSE",E(p['name']),p['summary'],f'<div class="mt-3"><a class="btn btn-spl-primary me-2" href="{p["repo"]}" target="_blank" rel="noopener">View on GitHub ↗</a>'+(f'<a class="btn btn-spl-ghost me-2" href="https://pub.dev/packages/{p["pubdev"]}" target="_blank" rel="noopener">pub.dev ↗</a>' if p.get('pubdev') else '')+f'<a class="btn btn-spl-ghost" href="../packages.html" style="color:#fff">← All packages</a></div>')
    if p.get('features'):B+='<section><div class="container-xl"><div class="section-head reveal"><span class="tag">Features</span><h2>Why teams use it</h2></div><div class="row g-4">'+''.join(f'<div class="col-md-6 col-lg-4 reveal"><div class="pf-card"><h3>{x["t"]}</h3><p>{x["d"]}</p></div></div>' for x in p['features'])+'</div></div></section>'
    if p.get('steps'):B+='<section id="install"><div class="container-xl"><div class="row g-4">'+''.join(f'<div class="col-lg-6 reveal"><h3 style="font-weight:800">{s["t"]}</h3>'+(f'<p style="color:var(--text-dim)">{s["d"]}</p>' if s.get('d') else '')+f'<div class="code">{E(s["code"])}</div></div>' for s in p['steps'])+'</div></div></section>'
    if p.get('sections'):
        B+='<section><div class="container-xl"><div class="row g-5">'+''.join(f'<div class="col-lg-6 reveal"><div class="section-head"><span class="tag">{s["tag"]}</span><h2>{s["title"]}</h2></div><p style="color:var(--text-dim)">{s["text"]}</p>'+(f'<div class="code">{E(s["code"])}</div>' if s.get('code') else '')+(f'<div class="notice mt-3">{s["note"]}</div>' if s.get('note') else '')+'</div>' for s in p['sections'])+'</div></div></section>'
    c=p.get('config')
    if c:B+=f'<section><div class="container-xl"><div class="section-head reveal"><span class="tag">Configuration</span><h2>{c["title"]}</h2></div><div class="reveal" style="overflow-x:auto"><table class="cmp"><tr><th>Option</th><th>Default</th><th>Description</th></tr>'+''.join(f'<tr><td><code>{E(r[0])}</code></td><td>{E(r[1])}</td><td>{E(r[2])}</td></tr>' for r in c['rows'])+'</table></div>'
    else:B+='<section><div class="container-xl">'
    if p.get('lists'):B+='<div class="row g-4 mt-3">'+''.join(f'<div class="col-lg-6 reveal"><h3 style="font-weight:800;font-size:1.1rem">{E(l["title"])}</h3><ul class="check">'+''.join(f'<li>{i}</li>' for i in l['items'])+'</ul></div>' for l in p['lists'])+'</div>'
    B+='</div></section>'+CTA(*p.get('cta',['Need this built for you?','We integrate and ship it.']))
    ld='<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@type":"SoftwareSourceCode","name":p['name'],"description":p['summary'],"codeRepository":p['repo'],"programmingLanguage":"Dart" if p['platform']=='Flutter' else p['platform'],"license":"https://opensource.org/licenses/"+p['license'],"author":{"@type":"Organization","name":"PSBM Labs","url":SITE}})+'</script>\n'
    open(f"packages/{p['slug']}.html",'w',encoding='utf-8').write(shell(f"{p['name']} — {p['platform']} Package | PSBM Labs",p['summary'],f"packages/{p['slug']}.html",B,ld,True))
# ---- index
cards=''
for p in pk:
    pg=p['status']!='planned'
    cards+=f'<div class="col-md-6 col-lg-4 pk-item" data-s="{p["status"]}" data-t="{E((p["name"]+" "+p["tagline"]+" "+p["platform"]).lower(),True)}"><div class="app-card"><h3>{E(p["name"])}</h3><div class="cat">{p["platform"]} package</div><p>{p["tagline"]}</p><div class="app-meta">{badge(p)}'+(f'<span>{p["version"]}</span>' if p.get('version') else '')+f'<span>{p["license"]}</span></div><div class="dl-row">'+(f'<a class="dl-btn apk" href="packages/{p["slug"]}.html">Docs &amp; install</a>' if pg else '<span class="dl-btn" style="cursor:default">Coming soon</span>')+f'<a class="dl-btn" href="{p["repo"]}" target="_blank" rel="noopener">GitHub ↗</a></div></div></div>'
cards+='<div class="col-md-6 col-lg-4 pk-item" data-s="more" data-t="more coming soon"><div class="app-card" style="border-style:dashed;align-items:center;justify-content:center;text-align:center;min-height:220px"><div style="font-size:2rem">✨</div><h3>More packages coming</h3><p style="flex:0">We open-source the tools we build for our own apps. Watch our GitHub for new releases.</p><a class="dl-btn" href="https://github.com/psbmlabs" target="_blank" rel="noopener">Follow psbmlabs ↗</a></div></div>'
n=len([p for p in pk if p['status']!='planned'])
chips=''.join(f'<button data-f="{k}"{" class=on" if k=="all" else ""}>{v}</button>' for k,v in [('all','All'),('stable','Stable'),('beta','Beta'),('planned','Planned')])
B=HERO('OPEN SOURCE · BY PSBM LABS','Packages &amp; developer tools',f'Open-source Flutter packages we build for our own apps and share with the community. {n} available now, more on the way.')
B+=f'<section><div class="container-xl"><div class="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4 reveal"><div class="seg" id="pkSeg" style="margin:0">{chips}</div><input id="pkQ" type="search" placeholder="Search packages…" class="form-control" style="max-width:280px;border-radius:99px"></div><div class="row g-4" id="pkGrid">{cards}</div></div></section>'+CTA('Need a custom package or integration?','We build reusable Flutter and backend modules for teams — tell us what you need.')
B+='''<script>(function(){var f='all',q='';function r(){[].slice.call(document.querySelectorAll('.pk-item')).forEach(function(e){var s=e.dataset.s,ok=(f=='all'||s==f||s=='more')&&(!q||e.dataset.t.indexOf(q)>-1||s=='more'&&!q);e.style.display=ok?'':'none'})}window.pkRefilter=r;document.querySelectorAll('#pkSeg button').forEach(function(b){b.onclick=function(){document.querySelectorAll('#pkSeg button').forEach(function(x){x.className=''});b.className='on';f=b.dataset.f;r()}});document.getElementById('pkQ').oninput=function(){q=this.value.toLowerCase().trim();r()}})();</script>'''
ld='<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@type":"ItemList","name":"PSBM Labs open-source packages","itemListElement":[{"@type":"ListItem","position":i+1,"name":p['name'],"url":SITE+(f"packages/{p['slug']}.html" if p['status']!='planned' else 'packages.html')} for i,p in enumerate(pk)]})+'</script>\n'
open('packages.html','w',encoding='utf-8').write(shell('Open-Source Flutter Packages & Developer Tools | PSBM Labs','Open-source Flutter packages by PSBM Labs — analytics, tooling and more. Install guides, code samples and GitHub links.','packages.html',B,ld,False))
# ---- sitemap
sm=open('sitemap.xml',encoding='utf-8').read()
sm=re.sub(r'\s*<url><loc>'+re.escape(SITE)+r'packages/[^<]*</loc></url>','',sm)
add=''.join(f'  <url><loc>{SITE}packages/{p["slug"]}.html</loc></url>\n' for p in pk if p['status']!='planned')
sm=sm.replace('</urlset>',add+'</urlset>');open('sitemap.xml','w',encoding='utf-8').write(sm)
print('built',len(pk),'package(s)')

# ---- package.html (detail page rendered from Google Sheet via js/sheet.js)
PB=f'<div class="app-hero">{WAVE}<div class="container-xl" style="position:relative;z-index:1"><div class="eyebrow"><span class="dot"></span> FLUTTER PACKAGE</div><h1 id="pdName">Loading…</h1><p class="lead-spl" id="pdSummary" style="max-width:66ch"></p><div class="mt-3" id="pdActions"></div></div></div><div id="pkgDetail"><section><div class="container-xl">Loading…</div></section></div>'+CTA('Need this built for you?','We integrate and ship it.')
ph=shell('Package — PSBM Labs','Open-source Flutter package by PSBM Labs.','package.html',PB,'',False)
ph=re.sub(r'<link rel="canonical"[^>]*>\n?','',ph)
open('package.html','w',encoding='utf-8').write(ph)
