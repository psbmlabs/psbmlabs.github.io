/* PSBM Labs PDF to Word converter - runs 100% in the browser.
   Reads the PDF with pdf.js, rebuilds lines, paragraphs, lists, tables, real two-column sections, pictures,
   text colours, underline/strike, super/subscript, shading and external hyperlinks, and writes a .docx with JSZip.
   Pages with no usable text (scans) or pages that fail are kept as page pictures so the file always opens. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var clean = function (s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ''); };
  var tw = function (pt) { return Math.round(pt * 20); }, emu = function (pt) { return Math.round(pt * 12700); }, clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var BUL = /^[\u2022\u25AA\u25A0\u25CF\u25CB\u25E6\u2023\u2219\u00B7\u25AB\u2043]/, BULLET = /^(?:[\u2022\u25AA\u25A0\u25CF\u25CB\u25E6\u2023\u2219\u00B7*]|[-\u2013\u2014]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,4}[.)])\s+/;
  var hex = function (c) { return c ? ('0' + c[0].toString(16)).slice(-2) + ('0' + c[1].toString(16)).slice(-2) + ('0' + c[2].toString(16)).slice(-2) : null; };
  var dist = function (a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }, WHITE = [255, 255, 255];

  function famOf(name, cls) {
    var n = String(name || '').replace(/^[A-Z]{6}\+/, ''), l = n.toLowerCase();
    if (/arial|helvetica/.test(l)) return 'Arial'; if (/times/.test(l)) return 'Times New Roman'; if (/courier/.test(l)) return 'Courier New';
    var base = n.replace(/[-,_ ]?(bold|italic|oblique|regular|roman|medium|light|semibold|demi|black|book|mt|ps|std|pro|normal)+.*$/i, '').replace(/[^A-Za-z0-9 \u0980-\u09FF]/g, ' ').trim();
    if (base && base.length > 2 && !/^(g|f|font|tt|type|cid|identity)[ _]?\d*$/i.test(base)) return base;
    return /serif/.test(cls || '') && !/sans/.test(cls || '') ? 'Times New Roman' : /mono/.test(cls || '') ? 'Courier New' : 'Arial';
  }
  async function renderCanvas(pg, scale) { var vp = pg.getViewport({ scale: scale }), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, canvas: c, viewport: vp }).promise; return c; }
  var toPng = function (c) { return new Promise(function (r) { c.toBlob(r, 'image/png'); }).then(function (b) { return b.arrayBuffer(); }); };

  var BNC = '[\u0995-\u09B9\u09DC-\u09DF\u09CE\u09F0\u09F1]', BNCL = BNC + '\u09BC?(?:\u09CD' + BNC + '\u09BC?)*', BNVIS = new RegExp('(^|[^\u0980-\u09FF])[\u09BF\u09C7\u09C8](?=' + BNC + ')'), BNMOVE = new RegExp('([\u09BF\u09C7\u09C8])(' + BNCL + ')', 'g');
  function fixBn(s) { if (!/[\u09BF\u09C7\u09C8]/.test(s) || !BNVIS.test(s)) return s; return s.replace(BNMOVE, '$2$1').replace(/\u09C7([\u09BE\u09D7])/g, function (m, v) { return v === '\u09BE' ? '\u09CB' : '\u09CC'; }); }
  /* ---------------- page analysis ---------------- */
  async function analyse(pdfjs, pg, opt) {
    var vp = pg.getViewport({ scale: 1 }), W = vp.width, H = vp.height, U = pdfjs.Util, cache = {};
    var ops = await pg.getOperatorList(), tc = await pg.getTextContent(), ann = []; try { ann = await pg.getAnnotations(); } catch (e) { }
    var K = Math.max(.8, Math.min(2, 2400 / Math.max(W, H))), cv = await renderCanvas(pg, K), cx = cv.getContext('2d'), CW = cv.width, CH = cv.height, D = cx.getImageData(0, 0, CW, CH).data;
    function px(x, y) { x = clamp(Math.round(x), 0, CW - 1); y = clamp(Math.round(y), 0, CH - 1); var i = (y * CW + x) * 4; return [D[i], D[i + 1], D[i + 2]]; }
    function med(a) { return [0, 1, 2].map(function (k) { var v = a.map(function (p) { return p[k]; }).sort(function (x, y) { return x - y; }); return v[v.length >> 1]; }); }
    var probe = {
      bgAt: function (x, y) { return med([px(x * K, y * K), px((x - 2) * K, y * K), px((x + 2) * K, y * K), px(x * K, (y - 2) * K), px(x * K, (y + 2) * K)]); },
      hline: function (x1, x2, y1, y2) { var a = Math.round(x1 * K), b = Math.round(x2 * K); if (b - a < 4) return null; for (var y = Math.round(y1 * K); y <= Math.round(y2 * K); y++) { var n = 0, sum = [0, 0, 0]; for (var x = a; x <= b; x += 2) { var p = px(x, y); if (dist(p, WHITE) > 150) { n++; sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; } } if (n * 2 >= .8 * (b - a)) { var o1 = 0, o2 = 0; for (var x2 = a; x2 <= b; x2 += 2) { if (dist(px(x2, y - 3), WHITE) > 150) o1++; if (dist(px(x2, y + 3), WHITE) > 150) o2++; } if (o1 * 2 < .4 * (b - a) && o2 * 2 < .4 * (b - a)) return hex([sum[0] / n, sum[1] / n, sum[2] / n].map(Math.round)); } } return null; }
    };
    var links = []; ann.forEach(function (a) { var u = a.url || a.unsafeUrl; if (a.subtype === 'Link' && u && /^(https?:|mailto:|tel:)/i.test(u) && a.rect) { try { var m = vp.transform, ap = function (x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }, p1 = ap(a.rect[0], a.rect[1]), p2 = ap(a.rect[2], a.rect[3]); links.push({ x1: Math.min(p1[0], p2[0]), x2: Math.max(p1[0], p2[0]), y1: Math.min(p1[1], p2[1]), y2: Math.max(p1[1], p2[1]), url: u }); } catch (e) { } } });
    function style(fn) { if (cache[fn]) return cache[fn]; var o = null; try { if (pg.commonObjs.has(fn)) o = pg.commonObjs.get(fn); } catch (e) { } var nm = (o && (o.name || o.fallbackName)) || '', st = (tc.styles && tc.styles[fn]) || {}; return (cache[fn] = { fam: famOf(nm, st.fontFamily), b: /bold|black|heavy|semibold|demi/i.test(nm) || !!(o && o.bold), i: /italic|oblique/i.test(nm) || !!(o && o.italic) }); }
    /* ---- drawn table grids (found from the rendered page, so it works with any pdf.js version) ---- */
    function findGrids() {
      var minLen = Math.max(14, Math.round(9 * K)), HS = [], VS = [], R4 = CW * 4, mid = function (a, b) { return Math.round((a + b) / 2); };
      function dd(i, j) { return Math.abs(D[i] - D[j]) + Math.abs(D[i + 1] - D[j + 1]) + Math.abs(D[i + 2] - D[j + 2]); }
      for (var y = 3; y < CH - 3; y++) { var run = -1, base = y * R4; for (var x = 0; x <= CW; x++) { var on = false; if (x < CW) { var i = base + x * 4, u = i - 3 * R4, dn = i + 3 * R4; on = dd(i, u) >= 45 && dd(i, dn) >= 45 && dd(u, dn) <= 60; } if (on) { if (run < 0) run = x; } else if (run >= 0) { HS.push({ k: y, a: run, b: x - 1 }); run = -1; } } }
      for (var x2 = 3; x2 < CW - 3; x2++) { var run2 = -1; for (var y2 = 0; y2 <= CH; y2++) { var on2 = false; if (y2 < CH) { var j = (y2 * CW + x2) * 4, l = j - 12, r = j + 12; on2 = dd(j, l) >= 45 && dd(j, r) >= 45 && dd(l, r) <= 60; } if (on2) { if (run2 < 0) run2 = y2; } else if (run2 >= 0) { VS.push({ k: x2, a: run2, b: y2 - 1 }); run2 = -1; } } }
      function clean2(list) {
        list.sort(function (p, q) { return p.k - q.k || p.a - q.a; }); var out = []; list.forEach(function (s) { var l = out[out.length - 1]; if (l && l.k === s.k && s.a <= l.b + 3) l.b = Math.max(l.b, s.b); else out.push({ k: s.k, a: s.a, b: s.b }); });
        out = out.filter(function (s) { return s.b - s.a + 1 >= minLen; }); var res = []; out.forEach(function (s) { var hit = null; for (var q = res.length - 1; q >= 0 && s.k - res[q].k2 <= 2; q--) { var o = res[q], ov = Math.min(o.b, s.b) - Math.max(o.a, s.a); if (ov >= .5 * Math.min(o.b - o.a, s.b - s.a)) { hit = o; break; } } if (hit) { hit.k2 = s.k; hit.a = Math.min(hit.a, s.a); hit.b = Math.max(hit.b, s.b); } else res.push({ k: s.k, k2: s.k, a: s.a, b: s.b }); });
        return res.map(function (o) { return { k: (o.k + o.k2) / 2, n: o.k2 - o.k + 1, a: o.a, b: o.b }; });
      }
      var hs = clean2(HS), vs = clean2(VS); if (hs.length < 2 || vs.length < 2) return { grids: [], rules: [] };
      var par = []; for (var n = 0; n < hs.length + vs.length; n++) par.push(n); var find = function (a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
      hs.forEach(function (h, hi) { vs.forEach(function (v, vi) { if (v.k >= h.a - 3 && v.k <= h.b + 3 && h.k >= v.a - 3 && h.k <= v.b + 3) par[find(hi)] = find(hs.length + vi); }); });
      var comps = {}; hs.forEach(function (h, i) { var r = find(i); (comps[r] = comps[r] || { hs: [], vs: [] }).hs.push(h); }); vs.forEach(function (v, i) { var r = find(hs.length + i); (comps[r] = comps[r] || { hs: [], vs: [] }).vs.push(v); });
      var grids = [], usedH = {};
      Object.keys(comps).forEach(function (key) {
        var c = comps[key]; if (c.hs.length < 2 || c.vs.length < 2) return;
        function uniq(arr) { var s = arr.slice().sort(function (a, b) { return a - b; }), o = []; s.forEach(function (v) { if (!o.length || v - o[o.length - 1] > 4) o.push(v); }); return o; }
        var ys = uniq(c.hs.map(function (h) { return h.k; })), xs = uniq(c.vs.map(function (v) { return v.k; })); if (ys.length < 2 || xs.length < 2) return;
        var bw = (xs[xs.length - 1] - xs[0]) / K, bh = (ys[ys.length - 1] - ys[0]) / K; if (bw < 40 || bh < 14) return;
        var hCov = function (y, xa, xb) { var cov = 0; c.hs.forEach(function (s) { if (Math.abs(s.k - y) <= 4) cov += Math.max(0, Math.min(s.b, xb) - Math.max(s.a, xa)); }); return cov >= .6 * (xb - xa); };
        var vCov = function (x, ya, yb) { var cov = 0; c.vs.forEach(function (s) { if (Math.abs(s.k - x) <= 4) cov += Math.max(0, Math.min(s.b, yb) - Math.max(s.a, ya)); }); return cov >= .6 * (yb - ya); };
        var nr = ys.length - 1, nc = xs.length - 1, rows = [], cells = [];
        for (var r = 0; r < nr; r++) {
          var rc = [], cc = 0; while (cc < nc) { var c0 = cc; cc++; while (cc < nc && !vCov(xs[cc], ys[r], ys[r + 1])) cc++; var cell = { r: r, c: c0, cs: cc - c0, rs: 1, vm: null }; if (r > 0) { var above = rows[r - 1].filter(function (q) { return q.c === c0 && q.cs === cell.cs; })[0]; if (above && !hCov(ys[r], xs[c0], xs[cc])) { var owner = above.owner || above; owner.rs++; owner.vm = 'restart'; cell.vm = 'cont'; cell.owner = owner; } } rc.push(cell); cells.push(cell); } rows.push(rc);
        }
        var mid = function (a, b) { return Math.round((a + b) / 2); }, bgOf = function (cell) { var x1 = xs[cell.c] + 4, y1 = ys[cell.r] + 4, p = [px(x1, y1), px(x1 + 6, y1), px(x1, y1 + 6)]; return med(p); };
        cells.forEach(function (cell) { cell.x1 = xs[cell.c] / K; cell.x2 = xs[cell.c + cell.cs] / K; cell.y1 = ys[cell.r] / K; cell.y2 = ys[cell.r + (cell.owner ? 0 : cell.rs)] / K; var bg = bgOf(cell); cell.bg = dist(bg, WHITE) > 12 ? hex(bg) : null; cell.items = []; });
        cells.forEach(function (cell) { if (cell.owner) return; cell.y2 = ys[cell.r + cell.rs] / K; });
        var h0 = c.hs[0], lc = px(mid(h0.a, h0.b), Math.round(h0.k)); c.hs.forEach(function (h) { usedH[h.k + ':' + h.a] = 1; });
        grids.push({ x1: xs[0] / K, x2: xs[xs.length - 1] / K, y1: ys[0] / K, y2: ys[ys.length - 1] / K, xs: xs.map(function (v) { return v / K; }), ys: ys.map(function (v) { return v / K; }), cells: cells, nr: nr, nc: nc, color: hex(lc), thick: Math.max(.5, h0.n / K) });
      });
      var rules = hs.filter(function (h) { return !usedH[h.k + ':' + h.a] && (h.b - h.a) >= 60 * K; }).map(function (h) { return { y: h.k / K, x1: h.a / K, x2: h.b / K, color: hex(px(mid(h.a, h.b), Math.round(h.k))), thick: Math.max(.5, h.n / K) }; });
      return { grids: grids, rules: rules };
    }
    var GR = findGrids(), grids = GR.grids;
    var raw = [], bad = 0; tc.items.forEach(function (it) {
      if (typeof it.str !== 'string') return; bad += (it.str.match(/[\u0000\uFFFD]/g) || []).length; var s = fixBn(clean(it.str)); if (!s.trim()) return; var tr = U.transform(vp.transform, it.transform), size = Math.hypot(tr[2], tr[3]); if (!(size >= 1) || Math.abs(tr[1]) > .2 * size) return;
      var st = style(it.fontName); raw.push({ s: s, x: tr[4], y: tr[5], w: it.width || s.length * size * .5, size: size, fam: st.fam, b: st.b, i: st.i, bad: (it.str.match(/[\u0000\uFFFD]/g) || []).length });
    });
    var chars = raw.reduce(function (a, i) { return a + i.s.length; }, 0); if (chars < 8) return { scan: true, W: W, H: H, pic: cv };
    var pageBgs = [], ink = function (x, y, bg) { return dist(px(x, y), bg) > 100; };
    function spans(x1, x2, ya, yb, bg, minLen) {
      var out = []; for (var y = Math.round(ya); y <= Math.round(yb); y++) { var run = -1; for (var x = x1; x <= x2 + 1; x++) { var on = x <= x2 && ink(x, y, bg); if (on) { if (run < 0) run = x; } else if (run >= 0) { if (x - run >= minLen) out.push([run, x - 1]); run = -1; } } }
      out.sort(function (a, b) { return a[0] - b[0]; }); var m = []; out.forEach(function (s) { var l = m[m.length - 1]; if (l && s[0] <= l[1] + 2) l[1] = Math.max(l[1], s[1]); else m.push(s.slice()); }); return m;
    }
    var W1 = { ' ': 278, '.': 278, ',': 278, ':': 278, ';': 278, '!': 278, 'I': 278, 't': 278, 'f': 278, "'": 191, '"': 355, '(': 333, ')': 333, '[': 278, ']': 278, '|': 260, '/': 278, 'i': 222, 'j': 222, 'l': 222, 'r': 333, '-': 333, 'c': 500, 'k': 500, 's': 500, 'v': 500, 'x': 500, 'y': 500, 'z': 500, 'J': 500, 'w': 722, 'm': 833, '%': 889, 'A': 667, 'B': 667, 'E': 667, 'K': 667, 'P': 667, 'S': 667, 'V': 667, 'X': 667, 'Y': 667, 'C': 722, 'D': 722, 'H': 722, 'N': 722, 'R': 722, 'U': 722, 'G': 778, 'O': 778, 'Q': 778, 'F': 611, 'T': 611, 'Z': 611, 'L': 556, 'M': 833, 'W': 944 };
    function cumW(str) { var c = [0], t = 0, i; for (i = 0; i < str.length; i++) { var ch = str.charAt(i), w = ch.charCodeAt(0) > 591 ? 700 : (W1[ch] || 556); t += w; c.push(t); } for (i = 0; i < c.length; i++) c[i] = t ? c[i] / t : i / Math.max(1, str.length); return c; }
    function pieces(o) {
      var x1 = Math.round(o.x * K), x2 = Math.round((o.x + o.w) * K), y1 = Math.round((o.y - o.size * .85) * K), y2 = Math.round((o.y + o.size * .25) * K), len = o.s.length; if (x2 - x1 < 3 || y2 - y1 < 3) return [o];
      var pts = []; for (var k = 0; k < 5; k++) { var fx = x1 + (x2 - x1) * (k + .5) / 5; pts.push(px(fx, y1 - 2), px(fx, y2 + 2)); } pts.push(px(x1 - 3, (y1 + y2) / 2), px(x2 + 3, (y1 + y2) / 2)); var bg = med(pts); pageBgs.push(bg);
      var cls = [], cp = []; for (var x = x1; x <= x2; x++) { var best = 0, fp = null; for (var y = y1; y <= y2; y += 2) { var p = px(x, y), d = dist(p, bg); if (d > best) { best = d; fp = p; } } cls[x - x1] = best >= 120 ? ((fp[0] < 90 && fp[1] < 90 && fp[2] < 90) ? 'k' : hex(fp.map(function (v) { return (v >> 4) << 4; }))) : null; cp[x - x1] = best >= 120 ? fp : null; }
      var sm = cls.map(function (c, i) { var cnt = {}, top = null, n = 0; for (var j = Math.max(0, i - 2); j <= Math.min(cls.length - 1, i + 2); j++) if (cls[j]) { cnt[cls[j]] = (cnt[cls[j]] || 0) + 1; if (cnt[cls[j]] > n) { n = cnt[cls[j]]; top = cls[j]; } } return c ? top : null; });
      var cuts = [], cur = null; sm.forEach(function (c, i) { if (!c) return; if (cur && c !== cur) cuts.push(x1 + i); cur = c; });
      var us = spans(x1, x2, (o.y + o.size * .09) * K, (o.y + o.size * .26) * K, bg, 8), ss = spans(x1, x2, (o.y - o.size * .36) * K, (o.y - o.size * .22) * K, bg, Math.round(1.3 * o.size * K));
      us.concat(ss).forEach(function (s) { cuts.push(s[0], s[1] + 1); }); links.forEach(function (l) { if (l.y1 <= o.y && l.y2 >= o.y - o.size * .8) [l.x1, l.x2].forEach(function (lx) { if (lx > o.x + 1 && lx < o.x + o.w - 1) cuts.push(lx * K); }); });
      var cum = cumW(o.s), idx = [0]; cuts.sort(function (a, b) { return a - b; }).forEach(function (cx) { var fr = (cx - x1) / (x2 - x1), i = 0; while (i < len && cum[i + 1] < fr) i++; if (i < len && Math.abs(cum[i + 1] - fr) < Math.abs(cum[i] - fr)) i++; for (var d = 0; d <= 3; d++) { var c1 = i + d, c2 = i - d; if (c1 > 0 && c1 < len && o.s.charAt(c1 - 1) === ' ') { i = c1; break; } if (c2 > 0 && c2 < len && o.s.charAt(c2 - 1) === ' ') { i = c2; break; } } if (i > idx[idx.length - 1] && i < len) idx.push(i); }); idx.push(len);
      var res = []; for (var q = 0; q < idx.length - 1; q++) {
        var a = idx[q], b = idx[q + 1], p0 = { s: o.s.slice(a, b), x: o.x + o.w * cum[a], y: o.y, w: o.w * (cum[b] - cum[a]), size: o.size, fam: o.fam, b: o.b, i: o.i, bg: bg, bad: o.bad };
        if (!p0.s.trim()) { if (res.length) { res[res.length - 1].s += p0.s; res[res.length - 1].w += p0.w; } continue; }
        var px1 = Math.round(p0.x * K), px2 = Math.round((p0.x + p0.w) * K), cc = {}, topc = null, n = 0, wcol = 0; for (var xx = px1; xx <= px2; xx++) { var c = sm[xx - x1]; if (c) { cc[c] = (cc[c] || 0) + 1; wcol++; if (cc[c] > n) { n = cc[c]; topc = c; } } }
        if (topc && topc !== 'k') { var bd = 0, bp = null; for (var yy = y1; yy <= y2; yy += 2) for (var xx2 = px1; xx2 <= px2; xx2 += 2) { var pp = px(xx2, yy), dd = dist(pp, bg); if (dd > bd) { bd = dd; bp = pp; } } if (bp && !(bp[0] < 115 && bp[1] < 115 && bp[2] < 115)) p0.col = hex(bp); }
        var cover = function (arr) { var w2 = Math.max(1, px2 - px1), c2 = 0; arr.forEach(function (s) { c2 += Math.max(0, Math.min(px2, s[1]) - Math.max(px1, s[0])); }); return c2 / w2 >= .7; }; if (cover(us)) p0.u = 1; if (cover(ss)) p0.st = 1;
        var cxm = p0.x + p0.w / 2, cym = o.y - o.size * .3; links.some(function (l) { if (cxm >= l.x1 && cxm <= l.x2 && cym >= l.y1 && cym <= l.y2) { p0.link = l.url; return true; } }); res.push(p0);
      } return res.length ? res : [o];
    }
    var items = []; raw.forEach(function (o) { pieces(o).forEach(function (p) { items.push(p); }); });
    var pbg = pageBgs.length ? med(pageBgs) : WHITE; items.forEach(function (it) { if (it.bg && dist(it.bg, WHITE) > 24 && dist(it.bg, pbg) > 24) it.shd = hex(it.bg); });
    function buildLines(list) {
      list.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      var lines = []; list.forEach(function (it) {
        var L = null; for (var k = lines.length - 1; k >= 0; k--) { var c = lines[k]; if (it.y - c.y > 1.2 * Math.max(it.size, c.size)) break; var tol = (it.size < .92 * c.size || c.size < .92 * it.size) ? .65 * Math.max(it.size, c.size) : .38 * Math.max(it.size, c.size); if (Math.abs(c.y - it.y) <= tol) { L = c; break; } }
        if (!L) { L = { y: it.y, size: it.size, items: [] }; lines.push(L); } else if (it.size > L.size) { L.y = it.y; L.size = it.size; } L.items.push(it);
      });
      lines.forEach(function (L) {
      L.items.sort(function (a, b) { return a.x - b.x; }); var wsz = {}; L.items.forEach(function (i) { var k = Math.round(i.size * 2) / 2; wsz[k] = (wsz[k] || 0) + i.s.length; }); L.size = +Object.keys(wsz).sort(function (a, b) { return wsz[b] - wsz[a]; })[0]; var dom = L.items.filter(function (i) { return Math.abs(i.size - L.size) < .6; })[0]; L.y = dom ? dom.y : L.y;
      L.items.forEach(function (it) { if (it.size < .92 * L.size) { var dy = L.y - it.y; it.va = dy > .18 * L.size ? 'superscript' : (-dy > .12 * L.size ? 'subscript' : null); if (it.va) it.size = L.size; } });
      var f0 = L.items[0], bullet = null; if (L.items.length > 1 && BUL.test(f0.s.trim()) && f0.s.trim().length === 1) { bullet = { bx: f0.x, tx: L.items[1].x }; L.items.shift(); } else if (BUL.test(f0.s) && f0.s.replace(BUL, '').trim()) { bullet = { bx: f0.x, tx: f0.x + f0.size * 1.1 }; f0.s = f0.s.replace(BUL, '').replace(/^\s+/, ''); f0.x = bullet.tx; } L.bullet = bullet;
      var segs = [], cur = null, prev = null; L.items.forEach(function (it) {
        var gap = prev ? it.x - (prev.x + prev.w) : 0; if (!cur || gap > 1.6 * Math.max(it.size, L.size)) { cur = { x1: it.x, x2: it.x + it.w, runs: [], len: 0 }; segs.push(cur); } if (it.bad) cur.bad = true;
        else if (gap > .18 * it.size && !/\s$/.test(prev.s) && !/^\s/.test(it.s)) { var lr = cur.runs[cur.runs.length - 1]; if (lr) lr.t += ' '; cur.len++; }
        var r = cur.runs[cur.runs.length - 1], same = r && r.fam === it.fam && r.b === it.b && r.i === it.i && Math.abs(r.size - it.size) < .6 && r.col === it.col && !r.u === !it.u && !r.st === !it.st && r.va === it.va && r.shd === it.shd && r.link === it.link;
        if (same) r.t += it.s; else cur.runs.push({ t: it.s, fam: it.fam, b: it.b, i: it.i, size: it.size, col: it.col, u: it.u, st: it.st, va: it.va, shd: it.shd, link: it.link });
        cur.x2 = Math.max(cur.x2, it.x + it.w); cur.len += it.s.length; prev = it;
      });
      L.segs = segs; L.x1 = bullet ? bullet.bx : segs[0].x1; L.tx = segs[0].x1; L.x2 = segs[segs.length - 1].x2; var bc = 0, tc2 = 0; segs.forEach(function (s) { s.runs.forEach(function (r) { tc2 += r.t.length; if (r.b) bc += r.t.length; }); }); L.bold = bc > tc2 / 2; L.text = segs.map(function (s) { return s.runs.map(function (r) { return r.t; }).join(''); }).join('\t');
      });
      return lines;
    }
    var free = [], cellOf = function (g, x, y) { var c = -1, r = -1, i; for (i = 0; i < g.xs.length - 1; i++) if (x >= g.xs[i] - 1 && x < g.xs[i + 1]) c = i; for (i = 0; i < g.ys.length - 1; i++) if (y >= g.ys[i] - 1 && y < g.ys[i + 1]) r = i; if (c < 0 || r < 0) return null; var hit = null; g.cells.forEach(function (q) { if (q.c <= c && c < q.c + q.cs && q.r <= r && (r < q.r + (q.owner ? 1 : q.rs))) hit = q.owner || q; }); return hit; };
    items.forEach(function (it) { var cx = it.x + it.w / 2, cy = it.y - it.size * .3, put = false; grids.some(function (g) { if (cx >= g.x1 - 1 && cx <= g.x2 + 1 && cy >= g.y1 - 1 && cy <= g.y2 + 1) { var cell = cellOf(g, cx, cy); if (cell) { cell.items.push(it); put = true; return true; } } }); if (!put) free.push(it); });
    var lines = buildLines(free);
    grids.forEach(function (g) { var px1 = [], py1 = []; g.cells.forEach(function (c) { if (c.owner) return; c.lines = buildLines(c.items); if (c.lines.length) { px1.push(c.lines[0].x1 - c.x1); py1.push(c.lines[0].y - c.lines[0].size * .9 - c.y1); } }); var m = function (a, d) { a.sort(function (x, y) { return x - y; }); return a.length ? a[a.length >> 1] : d; }; g.padX = m(px1, 5); g.padY = m(py1, 2); });
    GR.rules.forEach(function (ru) { var best = null; lines.forEach(function (L) { var d = ru.y - L.y; if (d >= .1 * L.size && d <= 1.3 * L.size && L.x1 < ru.x2 && L.x2 > ru.x1 && (!best || d < ru.y - best.y)) best = L; }); if (best && !best.items.some(function (i) { return i.u; })) best.rule = { color: ru.color, thick: ru.thick }; });
    /* pictures */
    var imgs = []; if (opt.images) {
      var O = pdfjs.OPS, m = [1, 0, 0, 1, 0, 0], stack = [], boxes = []; for (var q = 0; q < ops.fnArray.length; q++) {
        var f = ops.fnArray[q], a = ops.argsArray[q];
        if (f === O.save) stack.push(m.slice()); else if (f === O.restore) { if (stack.length) m = stack.pop(); } else if (f === O.transform) m = U.transform(m, a); else if (f === O.paintFormXObjectBegin) { stack.push(m.slice()); if (a && a[0]) m = U.transform(m, a[0]); } else if (f === O.paintFormXObjectEnd) { if (stack.length) m = stack.pop(); }
        else if (f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintImageMaskXObject || f === O.paintImageXObjectRepeat) { var T2 = U.transform(vp.transform, m), xs = [], ys = []; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) { xs.push(T2[0] * c[0] + T2[2] * c[1] + T2[4]); ys.push(T2[1] * c[0] + T2[3] * c[1] + T2[5]); }); boxes.push({ x1: Math.min.apply(0, xs), x2: Math.max.apply(0, xs), y1: Math.min.apply(0, ys), y2: Math.max.apply(0, ys) }); }
      }
      boxes = boxes.filter(function (b) { var w = b.x2 - b.x1, h = b.y2 - b.y1; return w >= 24 && h >= 24 && w * h < .9 * W * H && b.x2 > 0 && b.y2 > 0 && b.x1 < W && b.y1 < H; }).filter(function (b, i, arr) { return arr.findIndex(function (c) { return Math.abs(c.x1 - b.x1) < 2 && Math.abs(c.y1 - b.y1) < 2 && Math.abs(c.x2 - b.x2) < 2; }) === i; }).slice(0, 12);
      boxes = boxes.filter(function (b) { var area = (b.x2 - b.x1) * (b.y2 - b.y1), cov = 0; lines.forEach(function (L) { var ox = Math.max(0, Math.min(b.x2, L.x2) - Math.max(b.x1, L.x1)), oy = Math.max(0, Math.min(b.y2, L.y + L.size * .2) - Math.max(b.y1, L.y - L.size * .8)); cov += ox * oy; }); return cov < .3 * area; });
      boxes.forEach(function (b) { var x = clamp(b.x1, 0, W), y = clamp(b.y1, 0, H), w = clamp(b.x2, 0, W) - x, h = clamp(b.y2, 0, H) - y; if (w < 8 || h < 8) return; var cc = document.createElement('canvas'); cc.width = Math.max(1, Math.round(w * K)); cc.height = Math.max(1, Math.round(h * K)); cc.getContext('2d').drawImage(cv, x * K, y * K, w * K, h * K, 0, 0, cc.width, cc.height); imgs.push({ x1: x, y1: y, w: w, h: h, c: cc }); });
    }
    return { W: W, H: H, lines: lines, imgs: imgs, probe: probe, grids: grids, bad: bad, cv: cv, K: K };
  }

  /* ---------------- layout ---------------- */
  var isBullet = function (L) { return !!L.bullet || (L.segs.length && BULLET.test(L.segs[0].runs[0].t) && L.text.length > 2); };
  function splitColumns(lines) {
    var segs = []; lines.forEach(function (l) { if (l.img || l.tbl) return; l.segs.forEach(function (s) { if (s.len >= 20) segs.push({ x1: s.x1, x2: s.x2, y: l.y }); }); }); if (segs.length < 8) return null;
    segs.sort(function (a, b) { return a.x1 - b.x1; }); var cl = []; segs.forEach(function (s) { var c = cl[cl.length - 1]; if (c && s.x1 - c.m < 12) { c.s.push(s); c.m = c.s.reduce(function (t, q) { return t + q.x1; }, 0) / c.s.length; } else cl.push({ m: s.x1, s: [s] }); });
    var big = cl.filter(function (c) { return c.s.length >= 4 && c.s.length >= .25 * segs.length; }); if (big.length !== 2) return null;
    var A = big[0], B = big[1], ax = A.s.map(function (s) { return s.x2; }).sort(function (x, y) { return x - y; }), ax2 = ax[Math.floor(ax.length * .95)] || ax[ax.length - 1]; if (ax2 >= B.m - 6) return null;
    var ya = A.s.map(function (s) { return s.y; }), yb = B.s.map(function (s) { return s.y; }), lo = Math.max(Math.min.apply(0, ya), Math.min.apply(0, yb)), hi = Math.min(Math.max.apply(0, ya), Math.max.apply(0, yb)), sh = Math.min(Math.max.apply(0, ya) - Math.min.apply(0, ya), Math.max.apply(0, yb) - Math.min.apply(0, yb)); if (hi - lo < .4 * sh) return null;
    return { leftEdge: ax2, rightStart: B.m, split: (ax2 + B.m) / 2 };
  }
  function mk(l, segs) { var c = {}; for (var k in l) c[k] = l[k]; c.segs = segs; c.x1 = segs[0].x1; c.x2 = segs[segs.length - 1].x2; c.text = segs.map(function (s) { return s.runs.map(function (r) { return r.t; }).join(''); }).join('\t'); return c; }
  function makeBands(lines, sp) {
    if (!sp) return [{ cols: false, lines: lines }]; var out = [], full = [], L = [], R = [], s = sp.split;
    var fc = function () { if (L.length || R.length) { out.push({ cols: true, left: L, right: R }); L = []; R = []; } }, ff = function () { if (full.length) { out.push({ cols: false, lines: full }); full = []; } };
    lines.forEach(function (l) {
      if (l.tbl) { fc(); full.push(l); return; }
      if (l.img) { var cx = (l.x1 + l.x2) / 2; if (l.x1 < s - 8 && l.x2 > s + 8) { fc(); full.push(l); } else { ff(); (cx < s ? L : R).push(l); } return; }
      if (l.segs.length === 1 && l.x1 < s - 6 && l.x2 > s + 6) { fc(); full.push(l); return; }
      ff(); var lf = l.segs.filter(function (q) { return q.x1 < s; }), rt = l.segs.filter(function (q) { return q.x1 >= s; }); if (lf.length) L.push(lf.length === l.segs.length ? l : mk(l, lf)); if (rt.length) R.push(rt.length === l.segs.length ? l : mk(l, rt));
    }); fc(); ff(); return out;
  }
  function tableAt(lines, i) {
    var f = lines[i]; if (f.img || f.tbl || f.segs.length < 2 || f.bullet || f.segs.some(function (s) { return s.len > 70; })) return null; var an = f.segs.map(function (s) { return s.x1; }), rows = [f];
    for (var j = i + 1; j < lines.length; j++) { var l = lines[j], p = rows[rows.length - 1]; if (l.img || l.tbl || l.y - p.y > 2.4 * Math.max(l.size, p.size)) break; if (!l.segs.every(function (s) { return an.some(function (a) { return Math.abs(a - s.x1) < 10; }); }) || l.segs.some(function (s) { return s.len > 70; })) break; if (l.segs.length < 2 && Math.abs(an[0] - l.segs[0].x1) < 10) break; rows.push(l); }
    return rows.length >= 2 && rows.filter(function (r) { return r.segs.length >= 2; }).length >= 2 ? { rows: rows, an: an } : null;
  }
  function canJoin(P, n, g) {
    var p = P.lines[P.lines.length - 1]; if (p.img || n.img || p.tbl || n.tbl || p.segs.length !== 1 || n.segs.length !== 1) return false; var dy = n.y - p.y, sz = Math.max(p.size, n.size);
    if (dy < .6 * sz || dy > 1.62 * sz || Math.abs(n.size - p.size) > .12 * p.size || n.bold !== p.bold || isBullet(n)) return false;
    var cp = Math.abs((p.x1 + p.x2) / 2 - g.cc) < 7 && p.x1 > g.l + 2 * sz, cn = Math.abs((n.x1 + n.x2) / 2 - g.cc) < 7 && n.x1 > g.l + 2 * sz; if (cp !== cn) return false;
    if (p.x2 < g.l + .6 * (g.r - g.l) && !cp) return false;
    var ref = P.lines.length > 1 ? P.lines[1].x1 : (P.lines[0].bullet ? P.lines[0].tx : P.lines[0].x1); if (!cp && n.x1 - ref > 1.2 * sz && p.x2 < g.r - .08 * (g.r - g.l)) return false; return true;
  }
  var top = function (l) { return l.img ? l.img.y1 : l.tbl ? l.tbl.y1 : l.y - l.size * .9; }, bot = function (l) { return l.img ? l.img.y1 + l.img.h : l.tbl ? l.tbl.y2 : l.y + l.size * .25; };
  function flow(ls, gb, prevBottom, allowTables, ctx) {
    var blocks = [], i = 0, prev = null, gcache = {};
    function local(l) { var key = Math.round(l.x1 / 8), g = gcache[key]; if (g) return g; var arr = ls.filter(function (x) { return !x.img && !x.tbl && x.x1 >= l.x1 - 40 && x.x1 <= l.x1 + 10 && x.x2 - x.x1 > 40; }), res = { l: gb.l, r: gb.r }; if (arr.length >= 3) { var xs = arr.map(function (x) { return x.x2; }).sort(function (a, b) { return a - b; }); res = { l: Math.min.apply(0, arr.map(function (x) { return x.x1; })), r: xs[Math.floor(xs.length * .9)] }; } res.cc = (res.l + res.r) / 2; return (gcache[key] = res); }
    while (i < ls.length) {
      var l = ls[i], g = local(l), before = prev ? Math.max(0, Math.min(40, top(l) - bot(prev) - (l.img || l.tbl ? 0 : l.size * .15))) : Math.max(0, Math.min(60, top(l) - prevBottom - (l.img || l.tbl ? 0 : l.size * .15)));
      if (l.img) { var ic = (l.img.x1 + l.img.w / 2), mid = (gb.l + gb.r) / 2; blocks.push({ k: 'img', img: l.img, before: before, al: ic > mid + 30 ? 'right' : Math.abs(ic - mid) < 20 ? 'center' : 'left', left: Math.max(0, l.img.x1 - gb.l) }); prev = l; i++; ctx.images++; continue; }
      if (l.tbl) { blocks.push({ k: 'gtbl', g: l.tbl, before: before, indent: l.tbl.x1 - gb.l }); prev = l; i++; ctx.tables++; continue; }
      var t = allowTables ? tableAt(ls, i) : null; if (t) { blocks.push({ k: 'tbl', t: t, before: before }); prev = t.rows[t.rows.length - 1]; i += t.rows.length; ctx.tables++; continue; }
      var P = { lines: [l] }; i++; while (i < ls.length && canJoin(P, ls[i], g)) { P.lines.push(ls[i]); i++; } prev = P.lines[P.lines.length - 1]; blocks.push({ k: 'p', P: P, before: before, g: g });
    }
    return { blocks: blocks, bottom: prev ? bot(prev) : prevBottom };
  }

  /* ---------------- xml ---------------- */
  function runXml(r) {
    var f = esc(r.fam || 'Arial'), fcs = /[\u0980-\u09FF]/.test(r.t) && /^(Arial|Times New Roman|Courier New|Helvetica|Calibri)$/i.test(r.fam || '') ? 'Nirmala UI' : f, sz = clamp(Math.round((r.size || 11) * 2), 2, 400);
    var p = '<w:rFonts w:ascii="' + f + '" w:hAnsi="' + f + '" w:eastAsia="' + f + '" w:cs="' + fcs + '"/>' + (r.b ? '<w:b/><w:bCs/>' : '') + (r.i ? '<w:i/><w:iCs/>' : '') + (r.st ? '<w:strike/>' : '') + (r.col ? '<w:color w:val="' + r.col + '"/>' : '') + '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>' + ((r.u || r.link) ? '<w:u w:val="single"/>' : '') + (r.shd ? '<w:shd w:val="clear" w:color="auto" w:fill="' + r.shd + '"/>' : '') + (r.va ? '<w:vertAlign w:val="' + r.va + '"/>' : '') + (/[\u0980-\u09FF]/.test(r.t) ? '<w:lang w:bidi="bn-BD"/>' : '');
    return String(r.t).split('\t').map(function (part, k) { return (k ? '<w:r><w:rPr>' + p + '</w:rPr><w:tab/></w:r>' : '') + (part ? '<w:r><w:rPr>' + p + '</w:rPr><w:t xml:space="preserve">' + esc(part) + '</w:t></w:r>' : ''); }).join('');
  }
  function runsXml(runs, ctx) {
    var out = '', i = 0; while (i < runs.length) { var u = runs[i].link; if (!u) { out += runXml(runs[i]); i++; continue; } var j = i, g = ''; while (j < runs.length && runs[j].link === u) { g += runXml(runs[j]); j++; } var id = ctx.links.indexOf(u); if (id < 0) { ctx.links.push(u); id = ctx.links.length - 1; } out += '<w:hyperlink r:id="rIdLnk' + (id + 1) + '" w:history="1">' + g + '</w:hyperlink>'; i = j; }
    return out;
  }
  function paraXml(B, Ml, sect, rank, ctx) {
    var P = B.P, ls = P.lines, g = B.g, size = ls[0].size, pitch = ls.length > 1 ? (ls[ls.length - 1].y - ls[0].y) / (ls.length - 1) : size * 1.2, spLine = clamp(Math.round(pitch / (size * 1.15) * 240), 200, 480);
    var bul = ls[0].bullet, multi = ls.length === 1 && ls[0].segs.length > 1 && !bul, restL = bul ? ls[0].tx : (ls.length > 1 ? Math.min.apply(0, ls.slice(1).map(function (x) { return x.x1; })) : ls[0].x1), first = bul ? 0 : ls[0].x1 - restL, left = Math.max(0, restL - Ml);
    var cw = g.r - g.l, centered = !bul && ls.every(function (x) { return Math.abs((x.x1 + x.x2) / 2 - g.cc) < 7 && x.x1 > g.l + 2 * size; }), right = !bul && !centered && ls.every(function (x) { return x.x2 > g.r - 6 && x.x1 > g.l + .3 * cw; }), just = !bul && ls.length >= 3 && ls.slice(0, -1).every(function (x) { return Math.abs(x.x2 - g.r) < 6 && Math.abs(x.x1 - ls[0].x1) < 6 + Math.max(0, first); });
    var jc = centered ? 'center' : right ? 'right' : just ? 'both' : 'left', runs = [];
    ls.forEach(function (L, k) { var rr = []; L.segs.forEach(function (s, si) { if (si) rr.push({ t: '\t', fam: s.runs[0].fam, size: L.size }); s.runs.forEach(function (r) { rr.push(r); }); }); if (k) { var lastR = runs[runs.length - 1]; if (lastR && !/[-\u2010]$/.test(lastR.t) && !/\s$/.test(lastR.t)) runs.push({ t: ' ', fam: lastR.fam, size: lastR.size }); } runs = runs.concat(rr); });
    var tabs = multi ? '<w:tabs>' + ls[0].segs.slice(1).map(function (s) { return '<w:tab w:val="left" w:pos="' + tw(s.x1 - Ml) + '"/>'; }).join('') + '</w:tabs>' : '';
    var lj = jc === 'left' || jc === 'both', ind = bul ? '<w:ind w:left="' + tw(left) + '" w:hanging="' + tw(Math.max(8, ls[0].tx - ls[0].x1)) + '"/>' : (lj && (left > 2 || first > 2 || first < -2) ? '<w:ind w:left="' + tw(left) + '"' + (first > 2 ? ' w:firstLine="' + tw(first) + '"' : first < -2 ? ' w:hanging="' + tw(-first) + '"' : '') + '/>' : '');
    return '<w:p><w:pPr>' + (rank != null ? '<w:pStyle w:val="Heading' + (rank + 1) + '"/>' : '') + (bul ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : '') + (ls[ls.length - 1].rule ? '<w:pBdr><w:bottom w:val="single" w:sz="' + clamp(Math.round(ls[ls.length - 1].rule.thick * 8), 2, 18) + '" w:space="2" w:color="' + ls[ls.length - 1].rule.color + '"/></w:pBdr>' : '') + tabs + '<w:spacing w:before="' + tw(B.before) + '" w:after="0" w:line="' + spLine + '" w:lineRule="auto"/>' + ind + '<w:jc w:val="' + jc + '"/>' + (sect || '') + '</w:pPr>' + runsXml(runs, ctx) + '</w:p>';
  }
  function tblXml(B, M, W, probe, ctx) {
    var t = B.t, rows0 = t.rows; rows0.forEach(function (r, i) { var nx = rows0[i + 1], pv = rows0[i - 1]; r.pitch = nx ? nx.y - r.y : pv ? r.y - pv.y : r.size * 1.5; });
    var an = t.an.slice().sort(function (a, b) { return a - b; }), maxR = Math.max.apply(0, rows0.map(function (r) { return r.x2; })), cw = [], lim = W - M.r, x1 = an[0] - 4, x2 = Math.min(lim, maxR + 10), grid = null;
    an.forEach(function (a, k) { cw.push(tw(clamp((k < an.length - 1 ? an[k + 1] : Math.min(lim, maxR + 14)) - a, 24, W))); });
    for (var i = 0; i < rows0.length && !grid; i++) { var r = rows0[i], y1, y2; if (i === 0) { y1 = r.y - r.size * 1.7; y2 = r.y - r.size * .85; } else { var p = rows0[i - 1]; y1 = p.y + p.size * .2; y2 = r.y - r.size * .85; } if (y2 > y1) grid = probe.hline(x1, x2, y1, y2); }
    var rows = rows0.map(function (r) {
      var cells = an.map(function () { return []; }); r.segs.forEach(function (s) { var k = 0; an.forEach(function (a, j) { if (Math.abs(a - s.x1) < 10) k = j; }); cells[k].push(s); });
      return '<w:tr><w:trPr><w:trHeight w:val="' + tw(Math.max(10, r.pitch || r.size * 1.5)) + '" w:hRule="atLeast"/></w:trPr>' + cells.map(function (c, k) {
        var rr = []; c.forEach(function (s, si) { if (si) rr.push({ t: ' ', fam: 'Arial', size: r.size }); s.runs.forEach(function (x) { var y = {}; for (var q in x) y[q] = x[q]; y.shd = null; rr.push(y); }); });
        var bg = probe.bgAt(an[k] - 3, r.y - r.size * .3), shd = dist(bg, WHITE) > 12 ? '<w:shd w:val="clear" w:color="auto" w:fill="' + hex(bg) + '"/>' : '';
        return '<w:tc><w:tcPr><w:tcW w:w="' + cw[k] + '" w:type="dxa"/>' + shd + '<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' + runsXml(rr, ctx) + '</w:p></w:tc>';
      }).join('') + '</w:tr>';
    }).join('');
    var bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (n) { return grid ? '<w:' + n + ' w:val="single" w:sz="4" w:space="0" w:color="' + grid + '"/>' : '<w:' + n + ' w:val="nil"/>'; }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + cw.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblInd w:w="' + tw(Math.max(0, an[0] - M.l)) + '" w:type="dxa"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + cw.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + rows + '</w:tbl>';
  }
  function gtblXml(B, W, ctx) {
    var g = B.g, xs = g.xs, ys = g.ys, nr = g.nr, nc = g.nc, pad = clamp(g.padX, 2, 12), padY = clamp(g.padY, 0, 8), colW = [], k;
    for (k = 0; k < nc; k++) colW.push(tw(xs[k + 1] - xs[k]));
    var rowsC = []; for (var r = 0; r < nr; r++) rowsC.push([]); g.cells.forEach(function (c) { rowsC[c.r].push(c); });
    var rows = rowsC.map(function (cs, r) {
      return '<w:tr><w:trPr><w:trHeight w:val="' + tw(Math.max(8, ys[r + 1] - ys[r])) + '" w:hRule="atLeast"/></w:trPr>' + cs.map(function (c) {
        var w = 0; for (var q = c.c; q < c.c + c.cs; q++) w += colW[q];
        var pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>' + (c.cs > 1 ? '<w:gridSpan w:val="' + c.cs + '"/>' : '') + (c.vm === 'restart' ? '<w:vMerge w:val="restart"/>' : c.vm === 'cont' ? '<w:vMerge/>' : '') + (c.bg ? '<w:shd w:val="clear" w:color="auto" w:fill="' + c.bg + '"/>' : ''), inner = '';
        if (!c.owner && c.lines && c.lines.length) { var f = flow(c.lines, { l: c.x1 + pad, r: c.x2 - pad }, c.y1, false, { images: 0, tables: 0 }); f.blocks.forEach(function (b, bi) { if (b.k !== 'p') return; b.before = bi === 0 ? 0 : Math.min(b.before, 10); inner += paraXml(b, c.x1 + pad, '', null, ctx); }); }
        if (!inner) inner = '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>'; return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + inner + '</w:tc>';
      }).join('') + '</w:tr>';
    }).join('');
    var sz = clamp(Math.round(g.thick * 8), 2, 18), bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (n) { return '<w:' + n + ' w:val="single" w:sz="' + sz + '" w:space="0" w:color="' + g.color + '"/>'; }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + colW.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblInd w:w="' + tw(Math.max(0, B.indent || 0)) + '" w:type="dxa"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="' + tw(padY) + '" w:type="dxa"/><w:left w:w="' + tw(pad) + '" w:type="dxa"/><w:bottom w:w="' + tw(padY) + '" w:type="dxa"/><w:right w:w="' + tw(pad) + '" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + colW.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + rows + '</w:tbl>';
  }
  function imgXml(B, rid, id, sect, W, Mwid) {
    var w = Math.min(B.img.w, Mwid), h = B.img.h * w / B.img.w;
    return '<w:p><w:pPr><w:spacing w:before="' + tw(B.before) + '" w:after="0"/>' + (B.left > 4 && B.al === 'left' ? '<w:ind w:left="' + tw(B.left) + '"/>' : '') + '<w:jc w:val="' + B.al + '"/>' + (sect || '') + '</w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + emu(w) + '" cy="' + emu(h) + '"/><wp:docPr id="' + id + '" name="Picture ' + id + '"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="image' + id + '.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emu(w) + '" cy="' + emu(h) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }
  var sectXml = function (W, H, M, type, cols) { return '<w:sectPr><w:type w:val="' + type + '"/><w:pgSz w:w="' + tw(W) + '" w:h="' + tw(H) + '"/><w:pgMar w:top="' + tw(M.t) + '" w:right="' + tw(M.r) + '" w:bottom="' + tw(M.b) + '" w:left="' + tw(M.l) + '" w:header="0" w:footer="0" w:gutter="0"/>' + (cols ? '<w:cols w:num="2" w:space="' + tw(cols[1]) + '" w:equalWidth="0"><w:col w:w="' + tw(cols[0]) + '" w:space="' + tw(cols[1]) + '"/><w:col w:w="' + tw(cols[2]) + '"/></w:cols>' : '<w:cols w:space="720"/>') + '</w:sectPr>'; };
  var tinyP = function (sect, brk) { return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr>' + (sect || '') + '</w:pPr>' + (brk ? '<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:br w:type="column"/></w:r>' : '') + '</w:p>'; };

  /* OCR repair for lines whose PDF text layer is damaged (needs the internet once to fetch the OCR engine; falls back to the PDF text on any problem) */
  async function ocrFix(a, worker, say) {
    var targets = [], fixed = 0, touched = [], K = a.K; function collect(lines) { (lines || []).forEach(function (L) { L.segs.forEach(function (sg) { if (sg.bad) targets.push({ L: L, s: sg }); }); }); }
    collect(a.lines); (a.grids || []).forEach(function (g) { g.cells.forEach(function (c) { if (!c.owner) collect(c.lines); }); });
    for (var i = 0; i < targets.length; i++) {
      var L = targets[i].L, sg = targets[i].s, x1 = Math.max(0, sg.x1 - 3), x2 = sg.x2 + 3, y1 = Math.max(0, L.y - L.size * 1.05), y2 = L.y + L.size * .5, sw = Math.round((x2 - x1) * K), sh = Math.round((y2 - y1) * K); if (sw < 4 || sh < 4) continue; say('OCR ' + (i + 1) + ' / ' + targets.length);
      var sc = clamp(64 / sh, 1, 4), c = document.createElement('canvas'); c.width = Math.round(sw * sc) + 24; c.height = Math.round(sh * sc) + 24; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(a.cv, Math.round(x1 * K), Math.round(y1 * K), sw, sh, 12, 12, Math.round(sw * sc), Math.round(sh * sc));
      var res = await worker.recognize(c), txt = clean(String(res && res.data && res.data.text || '')).replace(/\s*\n+\s*/g, ' ').trim();
      if (txt.length >= Math.max(1, sg.len * .3)) { var big = sg.runs.slice().sort(function (p, q) { return q.t.length - p.t.length; })[0]; sg.runs = [{ t: txt, fam: big.fam, b: big.b, i: big.i, size: big.size, col: big.col, u: big.u, st: big.st, link: big.link }]; sg.len = txt.length; sg.bad = false; fixed++; if (touched.indexOf(L) < 0) touched.push(L); }
    }
    touched.forEach(function (L) { L.text = L.segs.map(function (q) { return q.runs.map(function (r) { return r.t; }).join(''); }).join('\t'); });
    return fixed;
  }
  /* ---------------- main ---------------- */
  async function convert(pdfjs, JSZip, file, opt, say) {
    var pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, n = pdf.numPages, media = [], ctx = { images: 0, tables: 0, scanned: 0, links: [] }, body = '', docId = 1, linkCount = 0;
    async function pictureXml(k, a, last) {
      var pg = null, W = a.W, H = a.H; if (!W) { pg = await pdf.getPage(k + 1); var v = pg.getViewport({ scale: 1 }); W = v.width; H = v.height; }
      var M = { l: 36, r: 36, t: 36, b: 36 }, s0 = sectXml(W, H, M, 'nextPage', null), pic = a.pic; if (!pic) { try { pic = await renderCanvas(pg || await pdf.getPage(k + 1), 1.6); } catch (e) { pic = null; } }
      var xml; if (pic) { media.push(await toPng(pic)); var wpt = W - 72, hpt = pic.height / pic.width * wpt; xml = imgXml({ img: { w: wpt, h: hpt }, before: 0, al: 'center', left: 0 }, 'rIdImg' + media.length, docId++, last ? '' : s0, W, wpt); } else xml = tinyP(last ? '' : s0);
      return xml + (last ? s0 : '');
    }
    async function textXml(k, a, last) {
      var W = a.W, H = a.H, probe = a.probe, xs1 = a.lines.map(function (l) { return l.x1; }).sort(function (x, y) { return x - y; }), xs2 = a.lines.map(function (l) { return l.x2; }).sort(function (x, y) { return x - y; }), q = function (arr, f) { return arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * f)))]; };
      var gx1 = (a.grids || []).map(function (g) { return g.x1; }), gx2 = (a.grids || []).map(function (g) { return g.x2; }); xs1 = xs1.concat(gx1).sort(function (x, y) { return x - y; }); xs2 = xs2.concat(gx2).sort(function (x, y) { return x - y; });
      var first = a.lines[0] || { y: (a.grids[0] || { y1: 36 }).y1 + 10, size: 10 }, lastL = a.lines[a.lines.length - 1] || { y: (a.grids[a.grids.length - 1] || { y2: 36 }).y2 };
      var gTop = Math.min.apply(0, (a.grids || []).map(function (g) { return g.y1; }).concat([1e9])), gBot = Math.max.apply(0, (a.grids || []).map(function (g) { return g.y2; }).concat([-1e9])), M = { l: clamp(q(xs1, .02), 24, 150), r: clamp(W - q(xs2, .98), 24, 150), t: clamp(Math.min(first.y - first.size * .9, gTop), 18, 150), b: clamp(H - Math.max(lastL.y, gBot) - 6, 18, 150) }, lc = { images: 0, tables: 0 };
      for (var ii = 0; ii < a.imgs.length; ii++) { media.push(await toPng(a.imgs[ii].c)); a.imgs[ii].rid = 'rIdImg' + media.length; }
      var all = a.lines.slice(); a.imgs.forEach(function (im) { all.push({ img: im, y: im.y1, x1: im.x1, x2: im.x1 + im.w, size: im.h, segs: [], bold: false, text: '' }); }); (a.grids || []).forEach(function (g) { all.push({ tbl: g, y: g.y1, x1: g.x1, x2: g.x2, size: g.y2 - g.y1, segs: [], bold: false, text: '' }); }); all.sort(function (x, y) { return x.y - y.y || x.x1 - y.x1; });
      var sp = splitColumns(all), bands = makeBands(all, sp), cl = M.l, cr = W - M.r, prevBottom = M.t, sizes = {}, flows = [];
      if (sp && !(sp.leftEdge - cl > 30 && cr - sp.rightStart > 30)) { sp = null; bands = makeBands(all, null); }
      bands.forEach(function (b) {
        if (!b.cols) { var f = flow(b.lines, { l: cl, r: cr }, prevBottom, true, lc); flows.push({ b: b, f: f }); prevBottom = f.bottom; }
        else { var fl = flow(b.left, { l: cl, r: sp.leftEdge }, prevBottom, false, lc), fr = flow(b.right, { l: sp.rightStart, r: cr }, prevBottom, false, lc); flows.push({ b: b, fl: fl, fr: fr }); prevBottom = Math.max(fl.bottom, fr.bottom); }
      });
      flows.forEach(function (x) { (x.f ? [x.f] : [x.fl, x.fr]).forEach(function (f) { f.blocks.forEach(function (b) { if (b.k === 'p') { var s = Math.round(b.P.lines[0].size * 2) / 2, c = b.P.lines.reduce(function (t, l) { return t + l.text.length; }, 0); sizes[s] = (sizes[s] || 0) + c; } }); }); });
      var bodySz = +Object.keys(sizes).sort(function (x, y) { return sizes[y] - sizes[x]; })[0] || 11, big = Object.keys(sizes).map(Number).filter(function (s) { return s >= bodySz * 1.25; }).sort(function (x, y) { return y - x; });
      function emit(blocks, Ml, Mwid, sect) {
        var xml = ''; blocks.forEach(function (b, bi) {
          var isLast = bi === blocks.length - 1, sx = isLast ? sect : '';
          if (b.k === 'p') { var sz = Math.round(b.P.lines[0].size * 2) / 2, ri = big.indexOf(sz), rank = ri > -1 && b.P.lines.length <= 3 ? Math.min(ri, 2) : null; xml += paraXml(b, Ml, sx, rank, ctx); }
          else if (b.k === 'img') xml += imgXml(b, b.img.rid, docId++, sx, W, Mwid);
          else if (b.k === 'gtbl') { xml += gtblXml(b, W, ctx); if (isLast) xml += tinyP(sect); }
          else { xml += tblXml(b, { l: Ml, r: M.r }, W, probe, ctx); if (isLast) xml += tinyP(sect); }
        }); if (!blocks.length && sect) xml = tinyP(sect); return xml;
      }
      var xml = ''; flows.forEach(function (x, bi) {
        var lastBand = bi === flows.length - 1, type = bi === 0 ? 'nextPage' : 'continuous', cols = x.b.cols ? [sp.leftEdge - cl, sp.rightStart - sp.leftEdge, cr - sp.rightStart] : null, sect = sectXml(W, H, M, type, cols), sx = lastBand && last ? '' : sect;
        if (!x.b.cols) xml += emit(x.f.blocks, cl, cr - cl, sx); else { xml += emit(x.fl.blocks, cl, sp.leftEdge - cl, ''); if (x.fl.blocks.length && x.fr.blocks.length) xml += tinyP('', true); xml += emit(x.fr.blocks, sp.rightStart, cr - sp.rightStart, sx); if (!x.fl.blocks.length && !x.fr.blocks.length) xml += tinyP(sx); }
        if (lastBand && last) xml += sect;
      });
      if (!flows.length) xml = tinyP(last ? '' : sectXml(W, H, M, 'nextPage', null)) + (last ? sectXml(W, H, M, 'nextPage', null) : '');
      ctx.images += lc.images; ctx.tables += lc.tables; return xml;
    }
    var worker = null, ocrDead = !opt.ocr || !opt.loadTess, ocrFixed = 0;
    async function getWorker() { if (worker) return worker; await opt.loadTess(); worker = await window.Tesseract.createWorker('ben+eng', 1, {}); try { await worker.setParameters({ tessedit_pageseg_mode: '7' }); } catch (e) { } return worker; }
    for (var k = 0; k < n; k++) {
      say((k + 1) + ' / ' + n); var last = k === n - 1, a;
      try { var pg = await pdf.getPage(k + 1); a = await analyse(pdfjs, pg, opt); if (a.bad && !ocrDead) { try { var wk = await getWorker(); var fx = await ocrFix(a, wk, function (t) { say((k + 1) + ' / ' + n + ' \u00B7 ' + t); }); ocrFixed += fx; a.bad = 0; } catch (e) { ocrDead = true; } } ctx.bad = (ctx.bad || 0) + (a.bad || 0); } catch (e) { a = { scan: true }; }
      if (a.scan || !a.lines) { ctx.scanned++; try { body += await pictureXml(k, a, last); } catch (e) { var v = (await pdf.getPage(k + 1)).getViewport({ scale: 1 }); body += tinyP(last ? '' : sectXml(v.width, v.height, { l: 36, r: 36, t: 36, b: 36 }, 'nextPage', null)) + (last ? sectXml(v.width, v.height, { l: 36, r: 36, t: 36, b: 36 }, 'nextPage', null) : ''); } continue; }
      var snapM = media.length, snapL = ctx.links.length;
      try { body += await textXml(k, a, last); } catch (e) { media.length = snapM; ctx.links.length = snapL; ctx.scanned++; a.pic = null; body += await pictureXml(k, a, last); }
    }
    if (worker) { try { await worker.terminate(); } catch (e) { } }
    var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    var heads = [1, 2, 3].map(function (i) { return '<w:style w:type="paragraph" w:styleId="Heading' + i + '"><w:name w:val="heading ' + i + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="' + (i - 1) + '"/></w:pPr></w:style>'; }).join('');
    var z = new JSZip(); z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(file.name.replace(/\.pdf$/i, '')) + '</dc:title><dc:creator>PSBM Labs PDF to Word</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>');
    z.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PSBM Labs</Application></Properties>');
    z.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' + heads + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>');
    z.file('word/numbering.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>');
    z.file('word/settings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSe" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdNu" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' + media.map(function (m, i) { return '<Relationship Id="rIdImg' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image' + (i + 1) + '.png"/>'; }).join('') + ctx.links.map(function (u, i) { return '<Relationship Id="rIdLnk' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + esc(u) + '" TargetMode="External"/>'; }).join('') + '</Relationships>');
    media.forEach(function (m, i) { z.file('word/media/image' + (i + 1) + '.png', m); });
    z.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body + '</w:body></w:document>');
    var blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
    return { blob: blob, pages: n, scanned: ctx.scanned, tables: ctx.tables, images: ctx.images, links: ctx.links.length, unreadable: ctx.bad || 0, ocr: ocrFixed };
  }
  window.PSBMPdf2Word = { convert: convert };
})();
