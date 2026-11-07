#!/usr/bin/env python3
"""Rebuild founders.html (Founders + Our Story) from data/founders.json and data/story.json.
Run from repo root: python3 tools/build_founders.py"""
import json,os,re
from html import escape as E
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
SITE='https://psbmlabs.github.io/'
idx=open('index.html',encoding='utf-8').read()
head=idx[:idx.find('<!-- ============ HERO')].replace('class="nav-link active"','class="nav-link"')
foot=re.sub(r'<script type="application/ld\+json">.*?</script>\n','',idx[idx.find('<!-- ============ FOOTER'):],flags=re.S)
WAVE=re.search(r'<div class="waves".*?</svg></div>',idx,re.S).group(0)
F=json.load(open('data/founders.json',encoding='utf-8'));S=json.load(open('data/story.json',encoding='utf-8'))
title='Founders & Co-founders — Prothes Barai & Shreyasi Madhu | PSBM Labs'
desc='Meet the founders of PSBM Labs: Prothes Barai and Shreyasi Madhu, a husband-and-wife team of software engineers in Barisal, Bangladesh, with co-founder Angkan Barai — plus our full story.'
h=re.sub(r'<title>.*?</title>',f'<title>{E(title)}</title>',head,flags=re.S)
h=re.sub(r'(<meta name="description" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
for k in ['og:title','twitter:title']:h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(title,True),h)
for k in ['og:description','twitter:description']:h=re.sub(r'(<meta (?:property|name)="'+k+r'" content=")[^"]*',lambda m:m.group(1)+E(desc,True),h)
h=h.replace('<link rel="canonical" href="https://psbmlabs.github.io/">',f'<link rel="canonical" href="{SITE}founders.html">')
h=h.replace('<a class="nav-link" href="founders.html">','<a class="nav-link active" href="founders.html">',1)
avs=''.join(f'<img src="assets/{p["img"]}" alt="{E(p["name"])}" style="width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.85);margin-left:-14px;box-shadow:0 10px 24px -10px rgba(0,0,0,.6)">' for p in F)
B=f'<div class="app-hero">{WAVE}<div class="container-xl" style="position:relative;z-index:1"><div class="eyebrow"><span class="dot"></span> FOUNDER &amp; CO-FOUNDERS</div><h1>The people behind PSBM Labs</h1><p class="lead-spl" style="max-width:66ch">A husband-and-wife engineering team and a trusted co-founder — building apps and software from Barisal, Bangladesh.</p><div class="d-flex align-items-center mt-3" style="padding-left:14px">{avs}<a href="#our-story" class="btn btn-spl-ghost ms-4" style="color:#fff">Read our story ↓</a></div></div></div>'
def card(p):
    nm=f'<a href="{p["href"]}" style="color:inherit;text-decoration:underline;text-decoration-color:#aab4ff;text-underline-offset:4px">{E(p["name"])}</a>' if p['href'] else E(p['name'])
    btn=f'<a class="btn btn-spl-ghost" href="{p["href"]}" style="color:#0b1b33">Full profile →</a>' if p['href'] else ''
    return f'<div class="col-lg-4 reveal"><div class="couple-card"><div class="d-flex gap-3 align-items-center mb-3"><img src="assets/{p["img"]}" alt="{E(p["name"])}"><div><h3 style="font-weight:800;margin:0;font-size:1.25rem">{nm}</h3><div style="color:#4338ca;font-weight:600;font-size:.88rem">{E(p["role"])}</div></div></div><p style="color:var(--text-dim)">{E(p["bio"])}</p><div class="chips mb-3">'+''.join(f'<span>{E(t)}</span>' for t in p['tags'])+f'</div>{btn}</div></div>'
B+='<section><div class="container-xl"><div class="section-head reveal"><span class="tag">Founders</span><h2>Meet the team — click a name for the full profile</h2></div><div class="row g-4">'+''.join(card(p) for p in F)+'</div>'
B+='<div class="reveal mt-5" style="overflow-x:auto"><table class="cmp"><tr><th></th><th>Prothes Barai</th><th>Shreyasi Madhu</th></tr><tr><td><b>Role</b></td><td>Founder &amp; Engineer</td><td>Co-founder &amp; Engineer</td></tr><tr><td><b>Leads</b></td><td>Apps, backend &amp; databases</td><td>Full-stack web &amp; SEO</td></tr><tr><td><b>Core stack</b></td><td>Flutter, Kotlin, Firebase, WordPress</td><td>HTML/CSS, JavaScript, Django, WordPress</td></tr><tr><td><b>Education</b></td><td>B.Sc in CSE</td><td>B.Sc in CSE, BSMRSTU</td></tr><tr><td><b>Based in</b></td><td>Barisal, Bangladesh</td><td>Barisal, Bangladesh</td></tr></table></div></div></section>'
tl=''.join(f'<div class="it"><div class="yr">{E(c["year"])}</div><h4>{E(c["title"])}</h4><p>{E(c["text"])}</p>'+(f'<img src="assets/{c["image"]}" alt="{E(c["title"])}" style="max-width:100%;border-radius:14px;margin-top:.7rem">' if c.get('image') else '')+'</div>' for c in S['chapters'])
B+='<section id="our-story"><div class="container-xl"><div class="row g-5"><div class="col-lg-6 reveal"><div class="section-head"><span class="tag">Our story</span><h2>From self-taught to a shared studio</h2></div><div class="tl">'+tl+'<!-- add more chapters in data/story.json --></div></div><div class="col-lg-6 reveal"><div class="section-head"><span class="tag">Life &amp; work</span><h2>Why we build as a couple</h2></div>'+''.join(f'<p class="quote-story">{E(t)}</p>' for t in S['intro'])+'</div></div></div></section>'
B+='<section class="faq-s"><div class="container-xl"><div class="section-head reveal"><span class="tag">FAQ</span><h2>About the founders</h2></div><div class="reveal" style="max-width:820px">'+''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q,a in S['faq'])+'</div></div></section>'
B+='<section id="cta" style="padding-bottom:5rem"><div class="container-xl"><div class="cta-banner reveal"><h3>Work directly with the founders</h3><p>No sales team in between — one of us will reply personally.</p><a href="contact.html" class="btn btn-spl-primary">Start a conversation</a></div></div></section>'
org={"@type":"Organization","name":"PSBM Labs","url":SITE}
ld='<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@graph":[{"@type":"Person","name":"Prothes Barai","jobTitle":"Founder & Software Engineer","spouse":{"@type":"Person","name":"Shreyasi Madhu"},"worksFor":org,"url":SITE+"prothes.html","sameAs":["https://github.com/prothesbarai","https://www.linkedin.com/in/prothesbarai/"]},{"@type":"Person","name":"Shreyasi Madhu","jobTitle":"Co-founder & Full-Stack Developer","spouse":{"@type":"Person","name":"Prothes Barai"},"worksFor":org,"url":SITE+"shreyasi.html","sameAs":["https://github.com/shreyasimadhu"]},{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in S['faq']]}]})+'</script>\n'
open('founders.html','w',encoding='utf-8').write(h+B+ld+foot)
open('our-story.html','w',encoding='utf-8').write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Our Story — PSBM Labs</title><meta http-equiv="refresh" content="0; url=founders.html#our-story"><link rel="canonical" href="'+SITE+'founders.html"><meta name="robots" content="noindex"><script>location.replace("founders.html#our-story")</script></head><body><a href="founders.html#our-story">Our story</a></body></html>')
sm=open('sitemap.xml',encoding='utf-8').read()
sm=re.sub(r'\s*<url><loc>'+re.escape(SITE)+r'our-story\.html</loc></url>','',sm)
if 'founders.html' not in sm:sm=sm.replace('</urlset>',f'  <url><loc>{SITE}founders.html</loc></url>\n</urlset>')
open('sitemap.xml','w',encoding='utf-8').write(sm);print('founders built')
