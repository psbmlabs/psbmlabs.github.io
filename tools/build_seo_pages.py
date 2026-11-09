#!/usr/bin/env python3
"""Build crawlable static pages for every App and Package in the Google Sheet.

Why: apps.html / packages.html are filled by JavaScript from the Sheet, and most search
engines and AI crawlers do not run that JavaScript. This script turns each visible
Sheet row into its own real HTML page (apps/<slug>.html, packages/<slug>.html) with
schema.org data, then refreshes sitemap.xml, llms.txt and a <noscript> link list.

Usage (repo root):   python3 tools/build_seo_pages.py            # fetch live from the Sheet
                     python3 tools/build_seo_pages.py --json x.json   # use a saved copy
Hand-made pages are kept: a page is only overwritten if it is missing, a redirect, or
contains the marker <!-- seo-generated -->.
"""
import json,os,re,sys,glob,datetime,urllib.request
from html import escape as E
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
SITE='https://psbmlabs.github.io/';MARK='<!-- seo-generated -->';TODAY=datetime.date.today().isoformat()
def rd(p): return open(p,encoding='utf-8',newline='').read()
def wr(p,s):
    os.makedirs(os.path.dirname(p) or '.',exist_ok=True);open(p,'w',encoding='utf-8',newline='').write(s)
def vis(r): return (r.get('name') or r.get('title')) and not re.match(r'^(no|false|0|hide)$',(r.get('visible') or '').strip(),re.I)
def lines(t): return [x.strip() for x in (t or '').split('\n') if x.strip()]
# ---------- data ----------
def load():
    if '--json' in sys.argv: return json.load(open(sys.argv[sys.argv.index('--json')+1],encoding='utf-8'))
    try:
        url=json.load(open('data/site-config.json',encoding='utf-8')).get('appsScript','')
        if not url: raise ValueError('appsScript URL empty')
        d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'psbm-seo-builder'}),timeout=30))
        json.dump(d,open('data/sheet-snapshot.json','w',encoding='utf-8'),ensure_ascii=False,indent=1);return d
    except Exception as e:
        print('! live fetch failed:',e)
        if os.path.exists('data/sheet-snapshot.json'): print('  using data/sheet-snapshot.json');return json.load(open('data/sheet-snapshot.json',encoding='utf-8'))
        sys.exit('No data. Fix the Apps Script URL or pass --json.')
D=load();pk=sorted([p for p in D.get('packages',[]) if vis(p) and (p.get('status') or 'stable').lower()!='planned' and p.get('slug')],key=lambda p:(float(p.get('order') or 99),p['name']))
ap=sorted([a for a in D.get('apps',[]) if vis(a) and a.get('slug')],key=lambda a:(float(a.get('order') or 99),a['name']))
# ---------- shell (head + footer copied from index.html) ----------
idx=rd('index.html')
head=idx[:idx.find('<!-- ============ HERO')]
head=re.sub(r'<link rel="preload" as="image"[^>]*>\n?','',head).replace('class="nav-link active"','class="nav-link"').replace(' data-bn="ready"','')
foot=re.sub(r'<script type="application/ld\+json">.*?</script>\n','',idx[idx.find('<!-- ============ FOOTER'):],flags=re.S)
WAVE=re.search(r'<div class="waves".*?</svg></div>',idx,re.S).group(0)
def up(s): return re.sub(r'(href|src)="(?!https?:|#|mailto:|tel:|/|\.\./)([^"]+)"',r'\1="../\2"',s)
def shell(title,desc,url,body,ld,nav):
    h=re.sub(r'<title>.*?</title>','<title>'+E(title)+'</title>',head,flags=re.S)
    h=re.sub(r'(<meta name="description" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    for k in ['og:title','twitter:title']: h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(title,True),h)
    for k in ['og:description','twitter:description']: h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
    h=re.sub(r'(<meta property="og:url" content=")[^"]*',lambda m:m.group(1)+SITE+url,h)
    h=h.replace('<link rel="canonical" href="'+SITE+'">','<link rel="canonical" href="'+SITE+url+'">')
    h=h.replace('<a class="nav-link" href="%s.html">'%nav,'<a class="nav-link active" href="%s.html">'%nav,1)
    return up(h+MARK+'\n'+body+'<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False)+'</script>\n'+foot)
HERO=lambda eb,h1,lead,extra='':f'<div class="app-hero">{WAVE}<div class="container-xl" style="position:relative;z-index:1"><div class="eyebrow"><span class="dot"></span> {eb}</div><h1>{h1}</h1><p class="lead-spl" style="max-width:66ch">{lead}</p>{extra}</div></div>'
CTA='<section id="cta" style="padding-bottom:5rem"><div class="container-xl"><div class="cta-banner reveal"><h3>Need something like this built for you?</h3><p>Talk to the founders directly — no sales team in between.</p><a href="contact.html" class="btn btn-spl-primary">Start a conversation</a></div></div></section>'
def writable(path):
    if not os.path.exists(path): return True
    s=rd(path); return MARK in s or 'http-equiv="refresh"' in s
ORG={"@type":"Organization","@id":SITE+"#organization","name":"PSBM Labs","url":SITE}
# ---------- packages ----------
for p in pk:
    path=f"packages/{p['slug']}.html"
    if not writable(path): print('keep (hand-made):',path);continue
    feats=''.join(f'<div class="col-md-6 col-lg-4 reveal"><div class="pf-card"><h3>{E(a[0].strip())}</h3><p>{E((a[1] if len(a)>1 else "").strip())}</p></div></div>' for a in (l.split('|',1) for l in lines(p.get('features'))))
    code=lambda t,c:f'<div class="col-lg-6"><h3 style="font-weight:800">{t}</h3><div class="code">{E(c)}</div></div>' if c else ''
    det=''.join(f'<p class="quote-story" style="font-size:1rem">{E(x)}</p>' for x in lines(p.get('details')))
    cl=''.join('<tr>'+''.join(f'<td>{E(c.strip())}</td>' for c in (l.split('|')+['','',''])[:3])+'</tr>' for l in lines(p.get('changelog')))
    plat=p.get('platform') or 'Flutter';lic=p.get('license') or 'MIT'
    btn=(f'<a class="btn btn-spl-primary me-2" href="{E(p["repo"],True)}" target="_blank" rel="noopener">View on GitHub ↗</a>' if p.get('repo') else '')+(f'<a class="btn btn-spl-ghost" href="https://pub.dev/packages/{E(p["pubdev"],True)}" target="_blank" rel="noopener">pub.dev ↗</a>' if p.get('pubdev') else '')
    B=HERO(f'{E(plat.upper())} PACKAGE · {E(lic)} LICENSE',E(p['name']),E(p.get('summary') or p.get('tagline') or ''),f'<div class="mt-3">{btn}</div>')
    B+=f'<section><div class="container-xl"><div class="chips mb-4"><span>Version {E(p.get("version") or "—")}</span>'+(f'<span>Updated {E(p["updated"])}</span>' if p.get('updated') else '')+f'<span>License {E(lic)}</span><span>Platform {E(plat)}</span></div>'
    if feats: B+=f'<div class="section-head"><span class="tag">Features</span></div><div class="row g-4 mb-5">{feats}</div>'
    if p.get('install') or p.get('usage'): B+='<div class="row g-4">'+code('Install',p.get('install'))+code('Usage',p.get('usage'))+'</div>'
    if det: B+=f'<div class="mt-5"><div class="section-head"><span class="tag">Details</span></div>{det}</div>'
    if cl: B+=f'<div class="mt-5"><div class="section-head"><span class="tag">Changelog</span></div><div style="overflow-x:auto"><table class="cmp"><tr><th>Version</th><th>Date</th><th>Notes</th></tr>{cl}</table></div></div>'
    B+='</div></section>'+CTA
    ld={"@context":"https://schema.org","@type":"SoftwareSourceCode","name":p['name'],"description":p.get('summary') or p.get('tagline') or '',"programmingLanguage":"Dart" if plat=='Flutter' else plat,"license":lic,"author":ORG,"publisher":ORG,"url":SITE+path}
    if p.get('repo'): ld['codeRepository']=p['repo']
    if p.get('version'): ld['version']=p['version']
    wr(path,shell(f"{p['name']} — {plat} Package | PSBM Labs",p.get('tagline') or p.get('summary') or '',path,B,ld,'packages'));print('built',path)
# ---------- apps ----------
CAT={'finance':'FinanceApplication','health':'HealthApplication','education':'EducationApplication','shopping':'ShoppingApplication','retail':'BusinessApplication','business':'BusinessApplication','productivity':'ProductivityApplication','logistics':'BusinessApplication','agriculture':'BusinessApplication'}
for a in ap:
    path=f"apps/{a['slug']}.html"
    if not writable(path): print('keep (hand-made):',path);continue
    st=(a.get('status') or 'live').lower();play=(a.get('play_url') or '').strip().startswith('http');tags=[t.strip() for t in (a.get('tags') or '').split(',') if t.strip()]
    badge='Coming soon' if st=='coming' else ('Live on Google Play' if play else 'Beta — direct download')
    btns=(f'<a class="btn btn-spl-primary me-2" href="{E(a["play_url"],True)}" target="_blank" rel="noopener">▶ Google Play</a>' if play and st!='coming' else '')+(f'<a class="btn btn-spl-ghost me-2" href="{E(a["apk_url"],True)}" download>⬇ Direct APK</a>' if a.get('apk_url') and st!='coming' else '')+(f'<a class="btn btn-spl-ghost" href="{E(a["case_url"],True)}">Case study</a>' if a.get('case_url') else '')
    B=HERO(f'{E((a.get("category") or "Android app").upper())} · {E(badge.upper())}',E(a['name']),E(a.get('description') or ''),f'<div class="mt-3">{btns}</div>')
    B+='<section><div class="container-xl"><div class="chips mb-4"><span>'+E(badge)+'</span><span>Android</span>'+''.join(f'<span>{E(t)}</span>' for t in tags)+'</div><p class="quote-story">'+E(a.get('description') or '')+'</p><p style="color:var(--text-dim)">Built by <a href="about.html">PSBM Labs</a>, a software company in Barisal, Bangladesh. See all <a href="apps.html">PSBM Labs apps</a>.</p></div></section>'+CTA
    cat=next((v for k,v in CAT.items() if k in (a.get('category') or '').lower()),'UtilitiesApplication')
    ld={"@context":"https://schema.org","@type":"MobileApplication","name":a['name'],"description":a.get('description') or '',"operatingSystem":"Android","applicationCategory":cat,"url":SITE+path,"author":ORG,"publisher":ORG}
    if play: ld['installUrl']=a['play_url']
    if a.get('apk_url'): ld['downloadUrl']=a['apk_url']
    wr(path,shell(f"{a['name']} — Android App by PSBM Labs",(a.get('description') or '')[:158],path,B,ld,'apps'));print('built',path)
# ---------- noscript link lists + sitemap + llms.txt ----------
def noscript(page,title,items):
    s=rd(page);s=re.sub(r'<!-- seo-list:start -->.*?<!-- seo-list:end -->\n?','',s,flags=re.S)
    if not items: return wr(page,s)
    blk='<!-- seo-list:start -->\n<noscript><section><div class="container-xl"><h2>'+title+'</h2><ul>'+''.join(f'<li><a href="{u}">{E(n)}</a> — {E(d)}</li>' for u,n,d in items)+'</ul></div></section></noscript>\n<!-- seo-list:end -->\n'
    wr(page,s.replace('<footer class="footer-spl">',blk+'<footer class="footer-spl">',1))
PI=[(f"packages/{p['slug']}.html",p['name'],p.get('tagline') or '') for p in pk]
AI=[(f"apps/{a['slug']}.html",a['name'],a.get('description') or '') for a in ap]
noscript('packages.html','PSBM Labs open-source packages',PI);noscript('apps.html','PSBM Labs apps',AI)
sm=rd('sitemap.xml');sm=re.sub(r'\s*<url><loc>'+re.escape(SITE)+r'(?:packages|apps)/[^<]*</loc>.*?</url>','',sm)
sm=sm.replace('</urlset>',''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n' for u,_,_ in PI+AI)+'</urlset>')
wr('sitemap.xml',sm)
if os.path.exists('llms.txt'):
    parts=re.split(r'\n(?=## )',rd('llms.txt'));parts=[x for x in parts if not re.match(r'## (Apps|Packages)\b',x)]
    new=[]
    if AI: new.append('## Apps\n\n'+'\n'.join(f'- [{n}]({SITE}{u}): {d}' for u,n,d in AI)+'\n')
    if PI: new.append('## Packages\n\n'+'\n'.join(f'- [{n}]({SITE}{u}): {d}' for u,n,d in PI)+'\n')
    ci=next((i for i,x in enumerate(parts) if x.startswith('## Contact')),len(parts));parts[ci:ci]=new
    wr('llms.txt','\n'.join(x.rstrip('\n')+'\n' for x in parts))
print(f'done: {len(pk)} packages, {len(ap)} apps')
