#!/usr/bin/env python3
"""Build SEO pages for free tools from data/tools.json.
Output: free-tools/<slug>.html, free-tools.html (searchable), sitemap + llms.txt entries, nav link.
Usage (repo root): python3 tools/build_tool_pages.py
Add a tool = append one object to data/tools.json and run again.
Optional per-tool share image: assets/tools/<slug>.png (1200x630). Falls back to og-banner.jpg.
"""
import json, os, re, glob, datetime
from html import escape as E
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SITE = 'https://psbmlabs.github.io/'; TODAY = datetime.date.today().isoformat()
rd = lambda p: open(p, encoding='utf-8', newline='').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True); open(p, 'w', encoding='utf-8', newline='').write(s)
T = json.load(open('data/tools.json', encoding='utf-8'))

idx = rd('index.html')
head = idx[:idx.find('<!-- ============ HERO')]
head = re.sub(r'<link rel="preload" as="image"[^>]*>\n?', '', head).replace('class="nav-link active"', 'class="nav-link"').replace(' data-bn="ready"', '')
foot = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', idx[idx.find('<!-- ============ FOOTER'):], flags=re.S)
def up(s): return re.sub(r'(href|src)="(?!https?:|#|mailto:|tel:|/|\.\./)([^"]+)"', r'\1="../\2"', s)

def shell(title, desc, url, body, ld, sub, img):
    h = re.sub(r'<title>.*?</title>', lambda m: '<title>' + E(title) + '</title>', head, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + E(desc, True), h)
    for k in ['og:title', 'twitter:title']: h = re.sub(r'(<meta (?:property|name)="' + k + r'" content=")[^"]*', lambda m: m.group(1) + E(title, True), h)
    for k in ['og:description', 'twitter:description']: h = re.sub(r'(<meta (?:property|name)="' + k + r'" content=")[^"]*', lambda m: m.group(1) + E(desc, True), h)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + url, h)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + url, h)
    for k in ['og:image', 'twitter:image']: h = re.sub(r'(<meta (?:property|name)="' + k + r'" content=")[^"]*', lambda m: m.group(1) + img, h)
    h = h.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">') if sub else h
    if sub: h, f = up(h), up(foot)
    else: f = foot
    ldt = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n'
    return h + CSS + body + ldt + f

CSS = '''<script>try{if(new URLSearchParams(location.search).get('lang')==='bn'||localStorage.getItem('psbm_lang')==='bn')document.documentElement.classList.add('lang-bn')}catch(e){}</script>
<style>
html:not(.lang-bn) .bn{display:none!important}html.lang-bn .en{display:none!important}
.ft-wrap{padding:48px 0 72px}.ft-hero{padding:56px 0 24px;text-align:center}
.ft-crumb{font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text-faint)}.ft-crumb a{color:var(--teal)}
.ft-thumb{width:100%;max-width:420px;aspect-ratio:16/9;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:4rem;border:1px solid var(--line-bright)}
.ft-card{background:var(--bg-panel-solid);border:1px solid var(--line);border-radius:var(--radius);padding:20px;height:100%;display:flex;flex-direction:column;gap:10px;color:var(--text);text-decoration:none;transition:.2s}
.ft-img{width:100%;height:auto;border-radius:var(--radius);border:1px solid var(--line-bright);display:block;box-shadow:0 24px 50px -28px rgba(11,27,51,.5)}
.ft-card .ft-img{border-radius:12px}
.ft-card:hover{border-color:var(--teal);transform:translateY(-3px);color:var(--text)}.ft-card .ft-thumb{max-width:none}
.ft-tag{font-size:.72rem;color:var(--teal);font-family:'JetBrains Mono',monospace}
.ft-body{max-width:78ch;margin:0 auto}.ft-body h2{font-size:1.4rem;font-weight:700;margin:2.4rem 0 1rem}
.ft-body p,.ft-body li{color:var(--text-dim)}.ft-step{display:flex;gap:14px;margin-bottom:1rem}
.ft-step b.n{flex:0 0 34px;height:34px;border-radius:50%;background:var(--teal);color:#07142b;display:flex;align-items:center;justify-content:center}
.ft-code{background:#060912;border:1px solid var(--line-bright);border-radius:12px;padding:12px 14px;font-family:'JetBrains Mono',monospace;font-size:.82rem;word-break:break-all;display:flex;gap:10px;align-items:center;justify-content:space-between;color:var(--teal)}
.ft-code button,.ft-try button{background:var(--teal);color:#07142b;border:0;border-radius:8px;padding:6px 12px;font-weight:600;white-space:nowrap}
.ft-try{background:var(--bg-panel-solid);border:1px solid var(--line-bright);border-radius:var(--radius);padding:18px}
.ft-try input,#ftq{width:100%;background:#060912;border:1px solid var(--line-bright);border-radius:10px;padding:10px 14px;color:var(--text);margin-bottom:10px}
#ftout{white-space:pre-wrap;max-height:300px;overflow:auto;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text-dim);margin-top:12px}
.ft-note{border-left:3px solid var(--gold);padding:10px 14px;background:rgba(240,185,92,.07);border-radius:6px;font-size:.88rem;color:var(--text-dim)}
.pt-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:var(--shadow);margin:1.2rem 0;border-top:4px solid #4338ca}
.pt-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:1.2rem 0 0}.pt-tabs a,.pt-tabs button{padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:#fff;color:var(--text);font-weight:600;font-size:.85rem;text-decoration:none;cursor:pointer}.pt-tabs .on{background:#4338ca;color:#fff;border-color:#4338ca}
.pt-drop{border:2px dashed #b9c0ee;border-radius:18px;padding:34px 16px;text-align:center;cursor:pointer;background:linear-gradient(180deg,#f7f8ff,#fff);transition:.2s;color:var(--text);font-weight:600}.pt-drop.on,.pt-drop:hover{border-color:#4338ca;background:#eef0ff}.pt-ic{font-size:2rem;color:#4338ca}.pt-drop small{display:block;color:var(--text-dim);margin-top:6px;font-weight:400}
.pt-sm{font-size:.82rem;color:var(--text-dim);margin:.6rem 0}.pt-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin:8px 0;background:#fff}.pt-nm{flex:1;min-width:0;overflow-wrap:anywhere;font-weight:600}.pt-sz{font-size:.8rem;color:var(--text-dim);white-space:nowrap}.pt-it button{border:1px solid var(--line);background:#f4f5ff;border-radius:8px;padding:4px 9px;cursor:pointer}
.pt-pv{width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}.pt-in{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:10px;margin:4px 0 10px;background:#fff}.pt-l{font-weight:600;font-size:.85rem;display:block;margin-top:6px}.pt-o{display:block;margin:6px 0;font-weight:500}
.pt-go{margin-top:12px;padding:12px 22px;border:0;border-radius:12px;background:linear-gradient(135deg,#4338ca,#14b8a6);color:#fff;font-weight:700;cursor:pointer}.pt-go:disabled{opacity:.45;cursor:not-allowed}.pt-it .pt-dl{background:linear-gradient(135deg,#4338ca,#14b8a6);color:#fff;border:0;padding:7px 14px;border-radius:9px;font-weight:600}
.pt-msg{margin-top:10px;font-weight:600;color:#4338ca}.pt-msg.bad{color:#d92d4f}
.pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin:12px 0}.pt-pg{border:1px solid var(--line);border-radius:12px;padding:8px;text-align:center;background:#fff;cursor:grab}.pt-pg.del{opacity:.35}.pt-th{height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f1f2fa;border-radius:8px}.pt-th img{max-width:100%;max-height:100%;transition:transform .2s}.pt-bt{display:flex;gap:4px;justify-content:center;margin-top:6px}.pt-bt button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:2px 7px;cursor:pointer}
.pt-hub{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px;margin:1.6rem 0 .6rem}.pt-tile{display:block;background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;color:var(--text);text-decoration:none;transition:.2s;box-shadow:var(--shadow)}.pt-tile:hover{transform:translateY(-4px);border-color:var(--c,#4338ca);color:var(--text)}.pt-tile h3{font-size:1.1rem;font-weight:700;margin:14px 0 6px}.pt-tile p{margin:0;color:var(--text-dim);font-size:.9rem}
.pt-ico{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;flex:0 0 56px;border-radius:16px;color:var(--c,#4338ca);background:color-mix(in srgb,var(--c,#4338ca) 14%,#fff);border:1px solid color-mix(in srgb,var(--c,#4338ca) 35%,#fff)}.pt-mini{display:inline-flex;vertical-align:-3px}.pt-tabs a{display:inline-flex;align-items:center;gap:6px}
.pe-card{padding:14px}.pe-drop{border:2px dashed #b9c0ee;border-radius:18px;padding:60px 16px;text-align:center;cursor:pointer;background:linear-gradient(180deg,#f7f8ff,#fff);font-weight:600;color:var(--text)}.pe-drop.on,.pe-drop:hover{border-color:#4338ca;background:#eef0ff}.pe-drop small{display:block;color:var(--text-dim);margin-top:6px;font-weight:400}
.pe-bar,.pe-props,.pe-wm{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 4px}.pe-props{border-top:1px solid var(--line);min-height:50px}.pe-wm{border-top:1px solid var(--line);font-size:.85rem}.pe-wm #wmm{color:#4338ca;font-weight:600}.pe-bar .sp{flex:1}
.pe-app button,.pe-modal button{border:1px solid var(--line);background:#fff;border-radius:9px;padding:6px 11px;font-weight:600;font-size:.85rem;cursor:pointer;color:var(--text)}.pe-app button.on,.pe-modal .on{background:#4338ca;color:#fff;border-color:#4338ca}.pe-app .pe-dl,.pe-modal .pe-dl{background:linear-gradient(135deg,#4338ca,#14b8a6);color:#fff;border:0}.pe-app .pe-del{color:#d92d4f;margin-left:auto}
.pe-props label{font-size:.82rem;font-weight:600;display:inline-flex;align-items:center;gap:5px}.pe-props input[type=number]{width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:8px}.pe-props input[type=color]{width:34px;height:28px;padding:0;border:1px solid var(--line);border-radius:6px;background:#fff}.pe-props select{padding:5px 8px;border:1px solid var(--line);border-radius:8px}
.pe-main{display:flex;gap:10px;height:72vh;min-height:420px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#e9ebf5}.pe-side{width:118px;flex:0 0 118px;overflow:auto;background:#f7f8ff;padding:8px;border-right:1px solid var(--line)}.pe-th{position:relative;margin-bottom:8px;border:2px solid transparent;border-radius:8px;cursor:pointer;background:#fff;min-height:60px}.pe-th.on{border-color:#4338ca}.pe-th canvas{width:100%;display:block;border-radius:6px}.pe-th b{position:absolute;left:4px;bottom:4px;background:#4338ca;color:#fff;border-radius:6px;font-size:.7rem;padding:0 6px}
.pe-stage{flex:1;overflow:auto;padding:16px}.pe-page{position:relative;margin:0 auto;background:#fff;box-shadow:0 10px 30px -12px rgba(11,27,51,.5)}.pe-page canvas{display:block}#ti,#ly{position:absolute;inset:0}#ly{pointer-events:none}#ly .pe-o,#ly .pe-cv{pointer-events:auto}.pe-cv{position:absolute;pointer-events:none!important}
.pe-ti{position:absolute;cursor:text;border-radius:2px}.m-edit .pe-ti:hover{background:rgba(67,56,202,.16);outline:1px dashed #4338ca}.pe-page:not(.m-edit) #ti{display:none}.m-text{cursor:text}.m-cover{cursor:crosshair}
.pe-o{position:absolute;box-sizing:border-box}.pe-o.sel{outline:2px solid #4338ca}.pe-o img{width:100%;height:100%;display:block;pointer-events:none;user-select:none}.pe-o.t-img,.pe-o.t-cover{cursor:move}.pe-tx{outline:none;line-height:1.2;padding:0;min-height:1em}.pe-o.t-text:not(.sel) .pe-tx:hover{outline:1px dashed #4338ca}
.pe-mv,.pe-rz{display:none;position:absolute;width:14px;height:14px;background:#4338ca;border:2px solid #fff;border-radius:50%;z-index:3}.pe-o.sel .pe-mv,.pe-o.sel .pe-rz{display:block}.pe-mv{left:-9px;top:-9px;cursor:move}.pe-rz{right:-9px;bottom:-9px;cursor:nwse-resize;border-radius:4px}
.pe-msg{margin-top:8px;font-weight:600;color:#4338ca;min-height:1.2em}.pe-msg.bad{color:#d92d4f}.pe-modal{position:fixed;inset:0;background:rgba(10,13,31,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px}.pe-mb{background:#fff;border-radius:18px;padding:18px;max-width:560px;width:100%}.pe-mb canvas{width:100%;border:1.5px dashed #b9c0ee;border-radius:12px;background:#fafbff;touch-action:none;margin:8px 0}.pe-tabs,.pe-mf{display:flex;gap:6px}.pe-mf{justify-content:flex-end;margin-top:10px}
@media(max-width:800px){.pe-side{display:none}.pe-main{height:64vh}}
details.ft-faq{border-bottom:1px dashed var(--line);padding:.8rem 0}details.ft-faq summary{cursor:pointer;font-weight:600}
</style>
'''
def L(en, bn, tag='span'):
    return '<%s class="en">%s</%s><%s class="bn notranslate" lang="bn" translate="no">%s</%s>' % (tag, E(en), tag, tag, E(bn), tag)
def thumb(t, pre=''):
    f = 'assets/thumbs/%s.jpg' % t['slug']
    if os.path.exists(f):
        return '<img class="ft-img" src="%s%s" width="1200" height="630" alt="%s" loading="lazy">' % (pre, f, E(t['name'] + ': ' + t['tagline'], True))
    return '<div class="ft-thumb" style="background:linear-gradient(135deg,%s33,#10152A)">%s</div>' % (t['color'], t['emoji'])
def img(t):
    return SITE + ('assets/thumbs/%s.jpg' % t['slug'] if os.path.exists('assets/thumbs/%s.jpg' % t['slug']) else 'assets/og-banner.jpg')

PDF = [x for x in T if x.get('app') == 'pdf']
PDF_ORDER = ['editor', 'merge', 'split', 'compress', 'pdf2img', 'img2pdf', 'organize']
PDF_HUB = next((x for x in PDF if x['tool'] == 'hub'), None)
PICON = {
 'editor': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 'merge': '<path d="M8 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M16 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2M12 3v18M9 8l3-3 3 3M9 16l3 3 3-3"/>',
 'split': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
 'compress': '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
 'pdf2img': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
 'img2pdf': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="10" cy="13" r="1.5"/><path d="m18 18-3-3-5 4"/>',
 'organize': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'}
def picon(x, size=26): return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (size, size, PICON[x['tool']])
def pdf_body(t, steps, uses, faq, rel):
    hub = t['tool'] == 'hub'
    nm = {x['tool']: x for x in PDF}
    common = dict(priv=L('Private by design: your files are processed inside your browser and are never uploaded to PSBM Labs or anyone else.', 'গোপনীয়তা নিশ্চিত: আপনার ফাইল ব্রাউজারের ভেতরেই প্রসেস হয়, PSBM Labs বা অন্য কারও কাছে আপলোড হয় না।'),
        h_what=L('What is %s?' % t['name'], 'এটা কী?'), what=L(t['what_en'], t['what_bn']), h_how=L('How to use it', 'কীভাবে ব্যবহার করবেন'), steps=steps,
        h_who=L('Who is it useful for?', 'কার কী কাজে লাগে?'), uses=uses, h_faq=L('FAQ', 'সাধারণ প্রশ্ন'), faq=faq, h_more=L('More free tools', 'আরও ফ্রি টুল'), rel=rel, all=L('All tools', 'সব টুল'),
        h_cust=L('Need something custom?', 'নিজের মতো সফটওয়্যার চাই?'), cust=L('PSBM Labs builds apps and web platforms in Barisal, Bangladesh.', 'PSBM Labs বরিশাল, বাংলাদেশ থেকে অ্যাপ ও ওয়েব প্ল্যাটফর্ম বানায়।'), talk=L('Talk to us', 'কথা বলুন'),
        name=E(t['name']), title=L(t['title'], t['title_bn']), tag=L(t['tagline'], t['tagline_bn']))
    tail = """<p class="ft-note">%(priv)s</p>
<h2>%(h_what)s</h2><p>%(what)s</p>
<h2>%(h_how)s</h2>%(steps)s
<h2>%(h_who)s</h2><ul>%(uses)s</ul>
<h2>%(h_faq)s</h2>%(faq)s
<h2>%(h_more)s</h2><p>%(rel)s<a href="../free-tools.html">%(all)s</a></p>
<h2>%(h_cust)s</h2><p>%(cust)s <a href="../contact.html">%(talk)s</a></p>
</div></main>
""" % common
    if hub:
        tiles = ''.join('<a class="pt-tile" href="%s.html"><span class="pt-ico" style="--c:%s">%s</span><h3>%s</h3><p>%s</p></a>' % (nm[k]['slug'], nm[k]['color'], picon(nm[k], 30), E(nm[k]['name']), L(nm[k]['tagline'], nm[k]['tagline_bn'])) for k in PDF_ORDER)
        return """<main class="ft-wrap"><div class="container ft-body" style="max-width:980px">
<p class="ft-crumb"><a href="../index.html">Home</a> / <a href="../free-tools.html">Free Tools</a> / %(name)s</p>
<h1 style="font-weight:800">%(title)s</h1>
<p class="lead">%(tag)s</p>
<div class="pt-hub">%(tiles)s</div>
""" % dict(common, tiles=tiles) + tail
    chips = ''.join('<a href="%s.html"%s><span class="pt-mini" style="color:%s">%s</span> %s</a>' % (nm[k]['slug'], ' class="on"' if k == t['tool'] else '', nm[k]['color'], picon(nm[k], 16), E(nm[k]['name'])) for k in PDF_ORDER)
    ed = t['tool'] == 'editor'
    return """<main class="ft-wrap"><div class="container ft-body"%(wide)s>
<p class="ft-crumb"><a href="../index.html">Home</a> / <a href="../free-tools.html">Free Tools</a> / <a href="%(hub)s.html">%(hubname)s</a> / %(name)s</p>
<div class="d-flex align-items-center gap-3"><span class="pt-ico" style="--c:%(color)s">%(icon)s</span><h1 style="font-weight:800;margin:0">%(title)s</h1></div>
<p class="lead mt-3">%(tag)s</p>
<div class="pt-tabs">%(chips)s</div>
%(card)s
""" % dict(common, hub=PDF_HUB['slug'], hubname=E(PDF_HUB['name']), color=t['color'], icon=picon(t, 30), chips=chips, wide=' style="max-width:1240px"' if ed else '', card='<div class="pt-card pe-card"><div id="pe"></div></div>' if ed else '<div class="pt-card"><div id="pt" data-tool="%s"></div></div>' % t['tool']) + tail + '<script src="../assets/js/%s" defer></script>\n' % ('pdf-editor.js' if ed else 'pdf-tools.js')

# ---------- tool pages ----------
for t in T:
    url = SITE + 'free-tools/%s.html' % t['slug']
    steps = ''.join('<div class="ft-step"><b class="n">%d</b><div><b>%s</b><p class="mb-0">%s</p></div></div>' % (i + 1, L(s[0], s[1]), L(s[2], s[3], 'span')) for i, s in enumerate(t['steps']))
    ex = ''.join('<p class="mb-1"><b>%s</b></p><div class="ft-code"><span>%s</span><button onclick="ftCopy(this,this.previousElementSibling.textContent)">%s</button></div><br>' % (L(e[0], e[2] if len(e) > 2 else e[0]), E(e[1]), L('Copy', 'কপি')) for e in t.get('examples', []))
    uses = ''.join('<li><b>%s:</b> %s</li>' % (L(u[0], u[1]), L(u[2], u[3])) for u in t['uses'])
    faq = ''.join('<details class="ft-faq"><summary>%s</summary><p class="mt-2 mb-0">%s</p></details>' % (L(q[0], q[1]), L(q[2], q[3])) for q in t['faq'])
    rel = ''.join('<a href="%s.html">%s</a> &middot; ' % (r['slug'], E(r['name'])) for r in T if r['slug'] != t['slug'] and not (t.get('app') == 'pdf' and r.get('app') == 'pdf'))
    body = '''<main class="ft-wrap"><div class="container ft-body">
<p class="ft-crumb"><a href="../index.html">Home</a> / <a href="../free-tools.html">Free Tools</a> / %(name)s</p>
<h1 style="font-weight:800">%(title)s</h1>
%(thumb)s
<p class="mt-3"><b>%(tag)s</b></p>
<h2>%(h_what)s</h2><p>%(what)s</p>
<h2>%(h_try)s</h2>
<div class="ft-try"><input id="ftu" placeholder="https://example.com/some-article" aria-label="Page URL">
<button onclick="ftBuild()">%(b_build)s</button> <button onclick="ftRead()">%(b_prev)s</button>
<div class="ft-code mt-3"><span id="ftl">https://r.jina.ai/</span><button onclick="ftCopy(this,document.getElementById('ftl').textContent)">%(b_copy)s</button></div><div id="ftout"></div></div>
<p class="ft-note mt-3">%(privacy)s</p>
<h2>%(h_how)s</h2>%(steps)s
<h2>%(h_ex)s</h2>%(ex)s
<h2>%(h_who)s</h2><ul>%(uses)s</ul>
<h2>%(h_faq)s</h2>%(faq)s
<h2>%(h_more)s</h2><p>%(rel)s<a href="../free-tools.html">%(all)s</a></p>
<h2>%(h_cust)s</h2><p>%(cust)s <a href="../contact.html">%(talk)s</a></p>
</div></main>
<script>
function ftBn(){return document.documentElement.classList.contains('lang-bn')}
function ftCopy(b,t){navigator.clipboard.writeText(t);b.textContent=ftBn()?'কপি হয়েছে':'Copied'}
function ftBuild(){var u=document.getElementById('ftu').value.trim();document.getElementById('ftl').textContent='https://r.jina.ai/'+u;return u}
async function ftRead(){var u=ftBuild(),o=document.getElementById('ftout'),b=ftBn();if(!/^https?:\\/\\//.test(u)){o.textContent=b?'http:// বা https:// দিয়ে শুরু করে পুরো লিংক দিন':'Enter a full link starting with http(s)://';return}
o.textContent=b?'লোড হচ্ছে...':'Loading...';try{var r=await fetch('https://r.jina.ai/'+u);var x=await r.text();o.textContent=x.slice(0,3000)+(x.length>3000?'\\n...':'')}catch(e){o.textContent=b?'এখানে লোড হয়নি। লিংক কপি করে নতুন ট্যাবে খুলুন।':'Could not load here. Copy the link and open it in a new tab.'}}
</script>
''' % dict(name=E(t['name']), title=L(t['title'], t['title_bn']), thumb=thumb(t, '../'), tag=L(t['tagline'], t['tagline_bn']),
          h_what=L('What is %s?' % t['name'], 'এটা কী?'), what=L(t['what_en'], t['what_bn']),
          h_try=L('Try it now', 'এখনই চেষ্টা করুন'), b_build=L('Build link', 'লিংক বানান'), b_prev=L('Preview text', 'টেক্সট দেখুন'), b_copy=L('Copy', 'কপি'),
          privacy=L('Privacy: the link is sent to Jina AI, a third-party service. Do not use private or paid pages. PSBM Labs is not affiliated with Jina AI; this page is a free guide.', 'গোপনীয়তা: লিংকটি তৃতীয় পক্ষ Jina AI-এর সার্ভারে যায়, তাই ব্যক্তিগত বা পেইড পেজে ব্যবহার করবেন না। Jina AI-এর সাথে PSBM Labs-এর কোনো সম্পর্ক নেই, এটি একটি ফ্রি গাইড।'),
          h_how=L('How it works', 'কীভাবে কাজ করে'), steps=steps, h_ex=L('Examples', 'উদাহরণ'), ex=ex,
          h_who=L('Who is it useful for?', 'কার কী কাজে লাগে?'), uses=uses, h_faq=L('FAQ', 'সাধারণ প্রশ্ন'), faq=faq,
          h_more=L('More free tools', 'আরও ফ্রি টুল'), rel=rel, all=L('All tools', 'সব টুল'),
          h_cust=L('Need something custom?', 'নিজের মতো সফটওয়্যার চাই?'), cust=L('PSBM Labs builds apps and web platforms in Barisal, Bangladesh.', 'PSBM Labs বরিশাল, বাংলাদেশ থেকে অ্যাপ ও ওয়েব প্ল্যাটফর্ম বানায়।'), talk=L('Talk to us', 'কথা বলুন'))
    if t.get('app') == 'pdf': body = pdf_body(t, steps, uses, faq, rel)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": t['title'], "description": t['tagline'], "inLanguage": ["en", "bn"], "isPartOf": {"@id": SITE + "#website"}, "dateModified": TODAY},
        {"@type": "HowTo", "name": "How to use " + t['name'], "step": [{"@type": "HowToStep", "position": i + 1, "name": s[0], "text": s[2]} for i, s in enumerate(t['steps'])]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q[0], "acceptedAnswer": {"@type": "Answer", "text": q[2]}} for q in t['faq']]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}, {"@type": "ListItem", "position": 2, "name": "Free Tools", "item": SITE + "free-tools.html"}, {"@type": "ListItem", "position": 3, "name": t['name'], "item": url}]}]}
    if t.get('app') == 'pdf' and t['tool'] != 'hub':
        bc = next(x for x in ld['@graph'] if x['@type'] == 'BreadcrumbList')['itemListElement']; bc.insert(2, {"@type": "ListItem", "position": 3, "name": PDF_HUB['name'], "item": SITE + 'free-tools/%s.html' % PDF_HUB['slug']}); bc[3]['position'] = 4
    if t.get('app') == 'pdf': ld['@graph'].append({"@type": "WebApplication", "name": t['name'], "url": url, "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any (web browser)", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "isAccessibleForFree": True})
    wr('free-tools/%s.html' % t['slug'], shell(t['title'] + ' | PSBM Labs', t['tagline'] + ' ' + t['what_en'][:90], url, body, ld, True, img(t)))

LIST = [x for x in T if not (x.get('app') == 'pdf' and x['tool'] != 'hub')]
def skw(x): return sum([[y['name'], y['tagline']] + y['keywords'] for y in PDF if y['tool'] != 'hub'], []) if x.get('tool') == 'hub' else []
# ---------- listing + on-site search ----------
cards = ''.join('<div class="col-md-6 col-lg-4 ft-item" data-s="%s"><a class="ft-card" href="free-tools/%s.html">%s<span class="ft-tag">%s</span><h3 class="h5 mb-0">%s</h3><p class="mb-0 text-secondary">%s</p></a></div>' % (
    E(' '.join([t['name'], t['category'], t['tagline'], t['tagline_bn']] + t['keywords'] + skw(t)).lower(), True), t['slug'], thumb(t), E(t['category']), E(t['name']), L(t['tagline'], t['tagline_bn'])) for t in LIST)
body = '''<main class="ft-wrap"><div class="container">
<div class="ft-hero"><h1 style="font-weight:800">%s</h1>
<p class="text-secondary">%s</p>
<div style="max-width:560px;margin:auto"><input id="ftq" type="search" placeholder="e.g. website theke text, link to markdown, ওয়েবসাইট থেকে লেখা" aria-label="Search tools"></div></div>
<div class="row g-4" id="ftgrid">%s</div><p id="ftnone" class="text-center text-secondary mt-4" style="display:none">%s</p></div></main>
<script>
(function(){var q=document.getElementById('ftq'),it=[].slice.call(document.querySelectorAll('.ft-item'));
function norm(s){return s.toLowerCase().replace(/[^a-z0-9\\u0980-\\u09FF ]+/g,' ')}
function go(){var w=norm(q.value).split(/ +/).filter(Boolean),n=0,r=it.map(function(e){var s=norm(e.dataset.s);return{e:e,all:w.every(function(x){return s.indexOf(x)>-1}),any:w.some(function(x){return s.indexOf(x)>-1})}}),strict=r.some(function(x){return x.all});r.forEach(function(x){var show=!w.length||(strict?x.all:x.any);x.e.style.display=show?'':'none';if(show)n++});document.getElementById('ftnone').style.display=n?'none':'block'}
q.addEventListener('input',go)})();
</script>
''' % (L('Free Tools', 'ফ্রি টুলস'), L('Guides and helpers for everyday work. Search in your own words: English, Bangla or Banglish.', 'দৈনন্দিন কাজের গাইড ও সহায়ক টুল। নিজের মতো করে ইংরেজি, বাংলা বা বাংলিশে লিখে খুঁজুন।'), cards, L('No match yet. More tools are coming.', 'মিল পাওয়া যায়নি, নতুন টুল আসছে।'))
ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Free Tools by PSBM Labs", "url": SITE + "free-tools.html",
      "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + 'free-tools/%s.html' % t['slug'], "name": t['name']} for i, t in enumerate(LIST)]}}
wr('free-tools.html', shell('Free Tools — Guides & Helpers | PSBM Labs', 'Free tools and step-by-step guides: convert webpages to text for AI, and more. Search in English, Bangla or Banglish.', SITE + 'free-tools.html', body, ld, False, SITE + 'assets/og-banner.jpg'))

# ---------- sitemap, llms.txt, nav ----------
sm = rd('sitemap.xml'); sm = re.sub(r'\s*<url><loc>' + re.escape(SITE) + r'free-tools[^<]*</loc>.*?</url>', '', sm)
add = ''.join('\n  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq><priority>%s</priority></url>' % (u, TODAY, 'weekly', p)
              for u, p in [(SITE + 'free-tools.html', '0.8')] + [(SITE + 'free-tools/%s.html' % t['slug'], '0.7') for t in T])
wr('sitemap.xml', sm.replace('</urlset>', add.lstrip('\n') + '\n</urlset>'))
ll = rd('llms.txt'); ll = re.sub(r'\n## Free tools\n.*?(?=\n## |\Z)', '', ll, flags=re.S).rstrip('\r\n')
ll += '\n\n## Free tools\n\n' + '\n'.join('- [%s](%sfree-tools/%s.html): %s' % (t['name'], SITE, t['slug'], t['tagline']) for t in T) + '\n'
wr('llms.txt', ll)
for f in glob.glob('*.html') + glob.glob('*/*.html'):
    if f.startswith(('tools/', 'apps-script/')): continue
    s = rd(f)
    if 'free-tools.html' in s or '>Blog</a></li>' not in s: continue
    p = '../' if '/' in f else ''
    s = re.sub(r'(<li class="nav-item"><a class="nav-link(?: active)?" href="[^"]*blog\.html">Blog</a></li>)', lambda m: m.group(1) + '\r\n        <li class="nav-item"><a class="nav-link" href="%sfree-tools.html">Free Tools</a></li>' % p, s, count=1)
    wr(f, s)
# ---------- Bangla dictionary entry for the nav label ----------
bj = rd('data/i18n/bn.json')
if '"Free Tools"' not in bj:
    wr('data/i18n/bn.json', bj.replace('{', '{\r\n"Free Tools": "ফ্রি টুলস",', 1))
# ---------- navbar fit fix (one-time, marked) ----------
NAVCSS = """
/* free-tools-nav: keep 11 menu items on one line; collapse to hamburger below 1200px */
.navbar-spl .nav-link{white-space:nowrap}
.navbar-spl .navbar-nav{flex-wrap:nowrap}
@media (min-width:1200px){
  #mainNav>.container-xl{max-width:1400px}
  .navbar-spl .navbar-nav{gap:0!important}
  .navbar-spl .nav-link{padding:.5rem .55rem;font-size:.86rem}
  .navbar-spl .nav-link.active::after{left:.55rem;right:.55rem}
  html.lang-bn .navbar-spl .nav-link{font-size:.8rem;padding:.5rem .45rem}
  .navbar-spl .btn-spl-primary{white-space:nowrap;padding:.6rem 1rem}
}
@media (min-width:992px) and (max-width:1199.98px){
  .navbar-expand-lg{flex-wrap:wrap}
  .navbar-expand-lg .navbar-toggler{display:block}
  .navbar-expand-lg .navbar-collapse{display:none!important;flex-basis:100%}
  .navbar-expand-lg .navbar-collapse.show,.navbar-expand-lg .navbar-collapse.collapsing{display:block!important}
  .navbar-expand-lg .navbar-nav{flex-direction:column}
  .navbar-spl .nav-link.active::after{left:0;right:auto;width:2rem}
}
"""
pc = rd('css/premium.css')
if 'free-tools-nav' not in pc: wr('css/premium.css', pc.rstrip() + '\r\n' + NAVCSS.replace('\n', '\r\n'))
print('built', len(T), 'tool page(s)')
