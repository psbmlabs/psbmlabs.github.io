#!/usr/bin/env python3
"""Generate premium, title-based cover images (1200x630 JPG) with no stock photos.

Sources : blog.html cards (title + category + link) and data/tools.json (free tools).
Output  : assets/thumbs/<slug>.jpg
Patches : blog.html cards (thumbnail instead of the plain number cover),
          blog/<slug>.html og:image / twitter:image / schema image,
          css/premium.css (one marked block).
Needs   : pip install playwright pillow && playwright install chromium
Usage   : python3 tools/build_thumbs.py        (safe to re-run; run after adding a post or tool)
"""
import os, re, json, base64, zlib, io
from html import escape as E
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SITE = 'https://psbmlabs.github.io/'
rd = lambda p: open(p, encoding='utf-8', newline='').read()
def wr(p, s): open(p, 'w', encoding='utf-8', newline='').write(s)

# ---------- icons (320x320 canvas, stroked with the accent gradient) ----------
def gear():
    t = ''.join('<line x1="160" y1="%d" x2="160" y2="%d" transform="rotate(%d 160 160)" stroke-width="26"/>' % (160 - 104, 160 - 80, a) for a in range(0, 360, 45))
    return t + '<circle cx="160" cy="160" r="72"/><circle cx="160" cy="160" r="30"/>'
ICON = {
 'phone': '<rect x="95" y="25" width="130" height="270" rx="30"/><path d="M140 55h40"/><rect x="122" y="95" width="76" height="56" rx="12"/><rect x="122" y="168" width="76" height="14" rx="7"/><rect x="122" y="196" width="48" height="14" rx="7"/><circle cx="160" cy="262" r="7" fill="url(#g)"/>',
 'chart': '<path d="M40 285h250"/><rect x="65" y="195" width="38" height="90" rx="9"/><rect x="132" y="145" width="38" height="140" rx="9"/><rect x="199" y="90" width="38" height="195" rx="9"/><path d="M55 125l75-45 50 22 85-62M228 40h40v40"/>',
 'card': '<rect x="35" y="75" width="250" height="170" rx="26"/><path d="M35 128h250"/><rect x="65" y="180" width="76" height="16" rx="8"/><circle cx="238" cy="196" r="24"/><path d="M227 196l8 8 15-17"/>',
 'layers': '<path d="M160 45l112 56-112 56L48 101z"/><path d="M48 149l112 56 112-56"/><path d="M48 197l112 56 112-56"/>',
 'cart': '<path d="M35 60h42l32 142h140l26-102H92"/><circle cx="135" cy="248" r="19"/><circle cx="236" cy="248" r="19"/>',
 'layout': '<rect x="45" y="45" width="230" height="230" rx="28"/><path d="M45 110h230M130 110v165"/><circle cx="78" cy="78" r="6" fill="url(#g)"/><circle cx="102" cy="78" r="6" fill="url(#g)"/><rect x="158" y="150" width="86" height="16" rx="8"/><rect x="158" y="184" width="60" height="16" rx="8"/>',
 'gear': gear(),
 'code': '<path d="M108 88L38 160l70 72M212 88l70 72-70 72M186 58l-52 204"/>',
 'people': '<circle cx="160" cy="96" r="38"/><path d="M85 262c0-62 150-62 150 0"/><circle cx="62" cy="140" r="24"/><circle cx="258" cy="140" r="24"/><path d="M20 235c4-34 40-44 66-30M300 235c-4-34-40-44-66-30"/>',
 'warning': '<path d="M160 38L290 258H30z" stroke-linejoin="round"/><path d="M160 118v68"/><circle cx="160" cy="222" r="6" fill="url(#g)"/>',
 'pos': '<path d="M78 35h164v248l-27-18-27 18-28-18-28 18-27-18-27 18z" stroke-linejoin="round"/><path d="M112 95h96M112 138h96M112 181h52"/>',
 'cloud': '<path d="M95 215a55 55 0 0 1 8-108 75 75 0 0 1 143 20 45 45 0 0 1-6 88z"/><path d="M160 280v-82M128 228l32-32 32 32"/>',
 'route': '<circle cx="90" cy="235" r="22"/><path d="M90 213C90 140 230 190 230 110" stroke-dasharray="2 18"/><path d="M230 108c0 0-46-50-46-86a46 46 0 0 1 92 0c0 36-46 86-46 86z" transform="translate(-0 40) scale(.9) translate(14 8)"/><circle cx="230" cy="92" r="14"/><path d="M30 290h260"/>',
 'doc': '<rect x="40" y="35" width="136" height="210" rx="20"/><path d="M70 85h76M70 120h76M70 155h50"/><path d="M196 140h84M250 112l30 28-30 28"/><rect x="190" y="205" width="90" height="52" rx="14"/><path d="M212 245v-26l12 14 12-14v26"/>',
}
RULES = [(r'logistics|fleet|freight', 'route'), (r'marketplace|agricultur|farmer|krishi', 'cart'), (r'cloudflare|tunnel|localhost', 'cloud'), (r'bkash|nagad|payment', 'card'), (r'\bpos\b|point of sale|retail', 'pos'), (r'firebase|backend|tech stack|native vs', 'layers'),
         (r'maintenance|maintain', 'gear'), (r'ui/ux|\bux\b|design', 'layout'), (r'e-?commerce|shop|store', 'cart'),
         (r'wordpress|custom software|signs you', 'code'), (r'mistake|outsourc', 'warning'), (r'hiring|hire|team|company|choose', 'people'),
         (r'jina|reader|webpage|markdown', 'doc'), (r'flutter|mobile app|\bapp\b', 'phone'), (r'cost|price|pricing', 'chart')]
def icon_for(txt):
    t = txt.lower()
    for rx, k in RULES:
        if re.search(rx, t): return k
    return 'code'
PAL = [('#2dd4bf', '#8b5cf6'), ('#fb7185', '#8b5cf6'), ('#fbbf24', '#6366f1'), ('#22d3ee', '#3b82f6'), ('#34d399', '#6366f1'), ('#f472b6', '#22d3ee')]
LOGO = 'data:image/png;base64,' + base64.b64encode(open('assets/logo2.png', 'rb').read()).decode()

def page(title, cat, sub, key, slug):
    a, b = PAL[zlib.crc32(slug.encode()) % len(PAL)]
    n = len(title); fs = 68 if n <= 34 else 60 if n <= 52 else 52 if n <= 72 else 45
    subh = '<p class="sub">%s</p>' % E(sub) if sub else ''
    return '''<!doctype html><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:#fff;
background:radial-gradient(900px 520px at 88%% 105%%,%(b)s55,transparent 60%%),radial-gradient(700px 460px at -5%% -10%%,%(a)s40,transparent 62%%),linear-gradient(135deg,#0a0f24 0%%,#141a45 55%%,#241a5e 100%%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.13) 1.3px,transparent 1.6px);background-size:30px 30px;-webkit-mask-image:linear-gradient(100deg,transparent 30%%,#000 95%%)}
.frame{position:absolute;inset:22px;border:1.5px solid rgba(255,255,255,.12);border-radius:30px}
.chip{position:absolute;left:78px;top:76px;display:flex;align-items:center;gap:12px;padding:10px 20px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font:600 19px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:#e8ecff}
.chip i{width:10px;height:10px;border-radius:50%%;background:linear-gradient(135deg,%(a)s,%(b)s);box-shadow:0 0 14px %(a)s}
.t{position:absolute;left:78px;top:150px;width:660px;height:330px;display:flex;flex-direction:column;justify-content:center}
h1{font:800 %(fs)spx/1.07 Inter;letter-spacing:-.025em;text-wrap:balance}
.sub{margin-top:20px;font:500 25px/1.35 Inter;color:#b9c2ee;max-width:600px}
.glass{position:absolute;right:86px;top:128px;width:380px;height:380px;border-radius:44px;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.22);box-shadow:0 40px 90px -30px %(b)s,inset 0 1px 0 rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;transform:rotate(3deg)}
.glass:before{content:"";position:absolute;inset:-26px;border-radius:64px;border:1px dashed rgba(255,255,255,.14)}
.glass svg{width:270px;height:270px;filter:drop-shadow(0 12px 28px %(a)s88)}
.brand{position:absolute;right:78px;bottom:54px;display:flex;align-items:center;gap:12px;font:600 21px/1 Inter;color:#cbd3f7}.brand img{width:38px;height:38px;border-radius:10px}.brand span{opacity:.7;font-weight:500}
.bar{position:absolute;left:78px;bottom:54px;width:120px;height:6px;border-radius:6px;background:linear-gradient(90deg,%(a)s,%(b)s)}
</style><div class="dots"></div><div class="frame"></div>
<div class="chip"><i></i>%(cat)s</div><div class="t"><h1>%(title)s</h1>%(subh)s</div>
<div class="glass"><svg viewBox="0 0 320 320" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%(a)s"/><stop offset="1" stop-color="%(b)s"/></linearGradient></defs>%(ic)s</svg></div>
<div class="bar"></div><div class="brand"><img src="%(logo)s">PSBM Labs <span>psbmlabs.github.io</span></div>''' % dict(
        a=a, b=b, fs=fs, cat=E(cat), title=E(title), subh=subh, ic=ICON[key], logo=LOGO)

# ---------- collect items ----------
items = []
blog = rd('blog.html')
for m in re.finditer(r'href="blog/([\w-]+)\.html"[^>]*class="project-card.*?<div class="project-cat">(.*?)</div>\s*<h3>(.*?)</h3>', blog, re.S):
    items.append(dict(slug=m.group(1), cat=m.group(2).replace('&middot;', '·').strip(), title=re.sub(r'<[^>]+>', '', m.group(3)).strip(), sub='', kind='blog'))
if os.path.exists('data/tools.json'):
    for t in json.load(open('data/tools.json', encoding='utf-8')):
        items.append(dict(slug=t['slug'], cat='Free Tool · ' + t['category'], title=t['name'], sub=t['tagline'], kind='tool'))

home = rd('index.html'); HOME_RX = re.compile(r'(<div class="project-card">\s*)<div class="project-cover[^"]*"><span class="glyph">[^<]*</span><span class="status-pill">([^<]*)</span></div>(\s*<div class="project-body">\s*<div class="project-cat">(.*?)</div>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>)', re.S)
def pslug(t): return 'project-' + re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
for m in HOME_RX.finditer(home):
    items.append(dict(slug=pslug(m.group(5)), cat=m.group(4).replace('&middot;', '·').strip(), title=re.sub(r'<[^>]+>', '', m.group(5)).strip(), sub=re.sub(r'<[^>]+>', '', m.group(6)).strip(), kind='project'))

# ---------- render ----------
os.makedirs('assets/thumbs', exist_ok=True)
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1200, 'height': 630})
    for it in items:
        pg.set_content(page(it['title'], it['cat'], it['sub'], icon_for(it['title'] + ' ' + it['cat']), it['slug']))
        im = Image.open(io.BytesIO(pg.screenshot(type='png'))).convert('RGB')
        im.save('assets/thumbs/%s.jpg' % it['slug'], quality=88, optimize=True, progressive=True)
    br.close()

# ---------- patch blog.html cards ----------
TITLES = {i['slug']: i['title'] for i in items}
def card(m):
    slug = m.group(2)
    if slug not in TITLES: return m.group(0)
    return m.group(1) + '<div class="project-cover has-thumb" style="background-image:url(assets/thumbs/%s.jpg)" role="img" aria-label="%s"><span class="status-pill">%s</span></div>' % (slug, E(TITLES[slug], True), m.group(3))
blog = re.sub(r'(href="blog/([\w-]+)\.html"[^>]*class="project-card[^>]*>\s*)<div class="project-cover[^"]*"><span class="glyph">[^<]*</span><span class="status-pill">([^<]*)</span></div>', card, blog)
wr('blog.html', blog)
def hcard(m):
    t = re.sub(r'<[^>]+>', '', m.group(5)).strip(); sl = pslug(t)
    return m.group(1) + '<div class="project-cover has-thumb" style="background-image:url(assets/thumbs/%s.jpg)" role="img" aria-label="%s"><span class="status-pill">%s</span></div>' % (sl, E(t, True), m.group(2)) + m.group(3)
wr('index.html', HOME_RX.sub(hcard, home))
# ---------- patch post pages: share image ----------
for it in items:
    if it['kind'] != 'blog': continue
    f = 'blog/%s.html' % it['slug']
    if os.path.exists(f):
        s = rd(f); wr(f, s.replace(SITE + 'assets/og-banner.jpg', SITE + 'assets/thumbs/%s.jpg' % it['slug']))
# ---------- css ----------
css = '\r\n/* thumbs */\r\n.project-card .project-cover.has-thumb,.project-card.large .project-cover.has-thumb{height:auto;aspect-ratio:1200/630;background-size:cover;background-position:center;background-repeat:no-repeat}\r\n.project-cover.has-thumb .glyph{display:none}\r\n'
pc = rd('css/premium.css')
if '/* thumbs */' not in pc: wr('css/premium.css', pc.rstrip() + css)
print('thumbs:', len(items))
