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

# ---------- tool pages ----------
for t in T:
    url = SITE + 'free-tools/%s.html' % t['slug']
    steps = ''.join('<div class="ft-step"><b class="n">%d</b><div><b>%s</b><p class="mb-0">%s</p></div></div>' % (i + 1, L(s[0], s[1]), L(s[2], s[3], 'span')) for i, s in enumerate(t['steps']))
    ex = ''.join('<p class="mb-1"><b>%s</b></p><div class="ft-code"><span>%s</span><button onclick="ftCopy(this,this.previousElementSibling.textContent)">%s</button></div><br>' % (L(e[0], e[2] if len(e) > 2 else e[0]), E(e[1]), L('Copy', 'কপি')) for e in t['examples'])
    uses = ''.join('<li><b>%s:</b> %s</li>' % (L(u[0], u[1]), L(u[2], u[3])) for u in t['uses'])
    faq = ''.join('<details class="ft-faq"><summary>%s</summary><p class="mt-2 mb-0">%s</p></details>' % (L(q[0], q[1]), L(q[2], q[3])) for q in t['faq'])
    rel = ''.join('<a href="%s.html">%s</a> &middot; ' % (r['slug'], E(r['name'])) for r in T if r['slug'] != t['slug'])
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
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": t['title'], "description": t['tagline'], "inLanguage": ["en", "bn"], "isPartOf": {"@id": SITE + "#website"}, "dateModified": TODAY},
        {"@type": "HowTo", "name": "How to use " + t['name'], "step": [{"@type": "HowToStep", "position": i + 1, "name": s[0], "text": s[2]} for i, s in enumerate(t['steps'])]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q[0], "acceptedAnswer": {"@type": "Answer", "text": q[2]}} for q in t['faq']]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}, {"@type": "ListItem", "position": 2, "name": "Free Tools", "item": SITE + "free-tools.html"}, {"@type": "ListItem", "position": 3, "name": t['name'], "item": url}]}]}
    wr('free-tools/%s.html' % t['slug'], shell(t['title'] + ' | PSBM Labs', t['tagline'] + ' ' + t['what_en'][:90], url, body, ld, True, img(t)))

# ---------- listing + on-site search ----------
cards = ''.join('<div class="col-md-6 col-lg-4 ft-item" data-s="%s"><a class="ft-card" href="free-tools/%s.html">%s<span class="ft-tag">%s</span><h3 class="h5 mb-0">%s</h3><p class="mb-0 text-secondary">%s</p></a></div>' % (
    E(' '.join([t['name'], t['category'], t['tagline'], t['tagline_bn']] + t['keywords']).lower(), True), t['slug'], thumb(t), E(t['category']), E(t['name']), L(t['tagline'], t['tagline_bn'])) for t in T)
body = '''<main class="ft-wrap"><div class="container">
<div class="ft-hero"><h1 style="font-weight:800">%s</h1>
<p class="text-secondary">%s</p>
<div style="max-width:560px;margin:auto"><input id="ftq" type="search" placeholder="e.g. website theke text, link to markdown, ওয়েবসাইট থেকে লেখা" aria-label="Search tools"></div></div>
<div class="row g-4" id="ftgrid">%s</div><p id="ftnone" class="text-center text-secondary mt-4" style="display:none">%s</p></div></main>
<script>
(function(){var q=document.getElementById('ftq'),it=[].slice.call(document.querySelectorAll('.ft-item'));
function norm(s){return s.toLowerCase().replace(/[^a-z0-9\\u0980-\\u09FF ]+/g,' ')}
function go(){var w=norm(q.value).split(/ +/).filter(Boolean),n=0;it.forEach(function(e){var s=norm(e.dataset.s),ok=w.every(function(x){return s.indexOf(x)>-1}),a=w.length&&!ok&&w.some(function(x){return s.indexOf(x)>-1});e.style.display=(!w.length||ok||a)?'':'none';if(!w.length||ok||a)n++});document.getElementById('ftnone').style.display=n?'none':'block'}
q.addEventListener('input',go)})();
</script>
''' % (L('Free Tools', 'ফ্রি টুলস'), L('Guides and helpers for everyday work. Search in your own words: English, Bangla or Banglish.', 'দৈনন্দিন কাজের গাইড ও সহায়ক টুল। নিজের মতো করে ইংরেজি, বাংলা বা বাংলিশে লিখে খুঁজুন।'), cards, L('No match yet. More tools are coming.', 'মিল পাওয়া যায়নি, নতুন টুল আসছে।'))
ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Free Tools by PSBM Labs", "url": SITE + "free-tools.html",
      "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + 'free-tools/%s.html' % t['slug'], "name": t['name']} for i, t in enumerate(T)]}}
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
