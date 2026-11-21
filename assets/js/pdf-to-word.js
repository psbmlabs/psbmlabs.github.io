/* PSBM Labs PDF to Word converter - runs 100% in the browser.
   Reads the PDF text layer with pdf.js, rebuilds lines, paragraphs, columns, simple tables and images, and writes a .docx with JSZip.
   Pages with no usable text (scans) or pages that fail are kept as page pictures so the file always opens. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var clean = function (s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ''); };
  var tw = function (pt) { return Math.round(pt * 20); }, emu = function (pt) { return Math.round(pt * 12700); }, clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var BULLET = /^(?:[\u2022\u25AA\u25A0\u25CF\u25CB\u25E6\u2023\u2219\u00B7\u2043*]|[-\u2013\u2014]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,4}[.)])\s+/;

  function famOf(name, cls) {
    var n = String(name || '').replace(/^[A-Z]{6}\+/, ''), l = n.toLowerCase();
    if (/arial|helvetica/.test(l)) return 'Arial'; if (/times/.test(l)) return 'Times New Roman'; if (/courier/.test(l)) return 'Courier New';
    var base = n.replace(/[-,_ ]?(bold|italic|oblique|regular|roman|medium|light|semibold|demi|black|book|mt|ps|std|pro|normal)+.*$/i, '').replace(/[^A-Za-z0-9 \u0980-\u09FF]/g, ' ').trim();
    if (base && base.length > 2 && !/^(g|f|font|tt|type|cid|identity)[ _]?\d*$/i.test(base)) return base;
    return /serif/.test(cls || '') && !/sans/.test(cls || '') ? 'Times New Roman' : /mono/.test(cls || '') ? 'Courier New' : 'Arial';
  }

  /* ---------------- page analysis ---------------- */
  async function analyse(pdfjs, pg, opt, media) {
    var vp = pg.getViewport({ scale: 1 }), W = vp.width, H = vp.height, ops = await pg.getOperatorList(), tc = await pg.getTextContent(), U = pdfjs.Util, cache = {};
    function style(fn) {
      if (cache[fn]) return cache[fn]; var o = null; try { if (pg.commonObjs.has(fn)) o = pg.commonObjs.get(fn); } catch (e) { }
      var nm = (o && (o.name || o.fallbackName)) || '', st = (tc.styles && tc.styles[fn]) || {}; return (cache[fn] = { fam: famOf(nm, st.fontFamily), b: /bold|black|heavy|semibold|demi/i.test(nm) || !!(o && o.bold), i: /italic|oblique/i.test(nm) || !!(o && o.italic) });
    }
    var items = []; tc.items.forEach(function (it) {
      if (typeof it.str !== 'string') return; var s = clean(it.str); if (!s.trim()) return; var tr = U.transform(vp.transform, it.transform), size = Math.hypot(tr[2], tr[3]); if (!(size >= 1) || Math.abs(tr[1]) > .2 * size) return;
      var st = style(it.fontName); items.push({ s: s, x: tr[4], y: tr[5], w: it.width || s.length * size * .5, size: size, fam: st.fam, b: st.b, i: st.i });
    });
    var chars = items.reduce(function (a, i) { return a + i.s.length; }, 0); if (chars < 8) return { scan: true, W: W, H: H };
    items.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lines = []; items.forEach(function (it) {
      var L = null; for (var k = lines.length - 1; k >= 0; k--) { var c = lines[k]; if (it.y - c.y > 1.2 * Math.max(it.size, c.size)) break; var tol = (it.size < .8 * c.size || c.size < .8 * it.size) ? .65 * Math.max(it.size, c.size) : .38 * Math.max(it.size, c.size); if (Math.abs(c.y - it.y) <= tol) { L = c; break; } }
      if (!L) { L = { y: it.y, size: it.size, items: [] }; lines.push(L); } L.items.push(it);
    });
    lines.forEach(function (L) {
      L.items.sort(function (a, b) { return a.x - b.x; }); var wsz = {}; L.items.forEach(function (i) { var k = Math.round(i.size * 2) / 2; wsz[k] = (wsz[k] || 0) + i.s.length; }); L.size = +Object.keys(wsz).sort(function (a, b) { return wsz[b] - wsz[a]; })[0]; var dom = L.items.filter(function (i) { return Math.abs(i.size - L.size) < .6; })[0]; L.y = dom ? dom.y : L.y;
      var segs = [], cur = null, prev = null; L.items.forEach(function (it) {
        var gap = prev ? it.x - (prev.x + prev.w) : 0; if (!cur || gap > 1.6 * Math.max(it.size, L.size)) { cur = { x1: it.x, x2: it.x + it.w, runs: [], len: 0 }; segs.push(cur); }
        else if (gap > .18 * it.size && !/\s$/.test(prev.s) && !/^\s/.test(it.s)) { var lr = cur.runs[cur.runs.length - 1]; if (lr) lr.t += ' '; cur.len++; }
        var r = cur.runs[cur.runs.length - 1]; if (r && r.fam === it.fam && r.b === it.b && r.i === it.i && Math.abs(r.size - it.size) < .6) r.t += it.s; else cur.runs.push({ t: it.s, fam: it.fam, b: it.b, i: it.i, size: it.size });
        cur.x2 = Math.max(cur.x2, it.x + it.w); cur.len += it.s.length; prev = it;
      });
      L.segs = segs; L.x1 = segs[0].x1; L.x2 = segs[segs.length - 1].x2; var bc = 0, tc2 = 0; segs.forEach(function (s) { s.runs.forEach(function (r) { tc2 += r.t.length; if (r.b) bc += r.t.length; }); }); L.bold = bc > tc2 / 2; L.text = segs.map(function (s) { return s.runs.map(function (r) { return r.t; }).join(''); }).join('\t');
    });
    /* images */
    var imgs = []; if (opt.images) {
      var O = pdfjs.OPS, m = [1, 0, 0, 1, 0, 0], stack = [], boxes = []; for (var q = 0; q < ops.fnArray.length; q++) {
        var f = ops.fnArray[q], a = ops.argsArray[q];
        if (f === O.save) stack.push(m.slice()); else if (f === O.restore) { if (stack.length) m = stack.pop(); } else if (f === O.transform) m = U.transform(m, a); else if (f === O.paintFormXObjectBegin) { stack.push(m.slice()); if (a && a[0]) m = U.transform(m, a[0]); } else if (f === O.paintFormXObjectEnd) { if (stack.length) m = stack.pop(); }
        else if (f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintImageMaskXObject || f === O.paintImageXObjectRepeat) { var T2 = U.transform(vp.transform, m), xs = [], ys = []; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) { xs.push(T2[0] * c[0] + T2[2] * c[1] + T2[4]); ys.push(T2[1] * c[0] + T2[3] * c[1] + T2[5]); }); boxes.push({ x1: Math.min.apply(0, xs), x2: Math.max.apply(0, xs), y1: Math.min.apply(0, ys), y2: Math.max.apply(0, ys) }); }
      }
      boxes = boxes.filter(function (b) { var w = b.x2 - b.x1, h = b.y2 - b.y1; return w >= 24 && h >= 24 && w * h < .9 * W * H && b.x2 > 0 && b.y2 > 0 && b.x1 < W && b.y1 < H; }).filter(function (b, i, arr) { return arr.findIndex(function (c) { return Math.abs(c.x1 - b.x1) < 2 && Math.abs(c.y1 - b.y1) < 2 && Math.abs(c.x2 - b.x2) < 2; }) === i; }).slice(0, 12);
      boxes = boxes.filter(function (b) { var area = (b.x2 - b.x1) * (b.y2 - b.y1), cov = 0; lines.forEach(function (L) { var ox = Math.max(0, Math.min(b.x2, L.x2) - Math.max(b.x1, L.x1)), oy = Math.max(0, Math.min(b.y2, L.y + L.size * .2) - Math.max(b.y1, L.y - L.size * .8)); cov += ox * oy; }); return cov < .3 * area; });
      if (boxes.length) { var c = await renderCanvas(pg, 2); boxes.forEach(function (b) { var x = clamp(b.x1, 0, W), y = clamp(b.y1, 0, H), w = clamp(b.x2, 0, W) - x, h = clamp(b.y2, 0, H) - y; if (w < 8 || h < 8) return; var cc = document.createElement('canvas'); cc.width = Math.round(w * 2); cc.height = Math.round(h * 2); cc.getContext('2d').drawImage(c, x * 2, y * 2, w * 2, h * 2, 0, 0, cc.width, cc.height); imgs.push({ x1: x, y1: y, w: w, h: h, c: cc }); }); }
    }
    return { W: W, H: H, lines: lines, imgs: imgs };
  }
  async function renderCanvas(pg, scale) { var vp = pg.getViewport({ scale: scale }), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, canvas: c, viewport: vp }).promise; return c; }
  var toPng = function (c) { return new Promise(function (r) { c.toBlob(r, 'image/png'); }).then(function (b) { return b.arrayBuffer(); }); };

  /* ---------------- layout ---------------- */
  var isBullet = function (L) { return L.segs.length && BULLET.test(L.segs[0].runs[0].t.trimStart ? L.segs[0].runs[0].t.trimStart() : L.segs[0].runs[0].t) && L.text.length > 2; };
  function splitColumns(lines) {
    var segs = []; lines.forEach(function (l) { if (l.img) return; l.segs.forEach(function (s) { if (s.len >= 20) segs.push({ x1: s.x1, x2: s.x2, y: l.y }); }); }); if (segs.length < 8) return null;
    segs.sort(function (a, b) { return a.x1 - b.x1; }); var cl = []; segs.forEach(function (s) { var c = cl[cl.length - 1]; if (c && s.x1 - c.m < 12) { c.s.push(s); c.m = c.s.reduce(function (t, q) { return t + q.x1; }, 0) / c.s.length; } else cl.push({ m: s.x1, s: [s] }); });
    var big = cl.filter(function (c) { return c.s.length >= 4 && c.s.length >= .25 * segs.length; }); if (big.length !== 2) return null;
    var A = big[0], B = big[1], ax = A.s.map(function (s) { return s.x2; }).sort(function (x, y) { return x - y; }), ax2 = ax[Math.floor(ax.length * .95)] || ax[ax.length - 1]; if (ax2 >= B.m - 6) return null;
    var ya = A.s.map(function (s) { return s.y; }), yb = B.s.map(function (s) { return s.y; }), lo = Math.max(Math.min.apply(0, ya), Math.min.apply(0, yb)), hi = Math.min(Math.max.apply(0, ya), Math.max.apply(0, yb)), sh = Math.min(Math.max.apply(0, ya) - Math.min.apply(0, ya), Math.max.apply(0, yb) - Math.min.apply(0, yb)); if (hi - lo < .4 * sh) return null;
    return (ax2 + B.m) / 2;
  }
  function order(lines, split) {
    if (split == null) return lines; var out = [], L = [], R = [], flush = function () { out = out.concat(L, R); L = []; R = []; };
    lines.forEach(function (l) {
      if (l.img) { var cx = (l.x1 + l.x2) / 2; if (l.x1 < split - 8 && l.x2 > split + 8) { flush(); out.push(l); } else (cx < split ? L : R).push(l); return; }
      if (l.segs.length === 1 && l.x1 < split - 6 && l.x2 > split + 6) { flush(); out.push(l); return; }
      var lf = l.segs.filter(function (s) { return s.x1 < split; }), rt = l.segs.filter(function (s) { return s.x1 >= split; });
      [[lf, L], [rt, R]].forEach(function (p) { if (p[0].length) p[1].push(mk(l, p[0])); });
    }); flush(); return out;
  }
  function mk(l, segs) { var c = {}; for (var k in l) c[k] = l[k]; c.segs = segs; c.x1 = segs[0].x1; c.x2 = segs[segs.length - 1].x2; c.text = segs.map(function (s) { return s.runs.map(function (r) { return r.t; }).join(''); }).join('\t'); return c; }
  function tableAt(lines, i) {
    var f = lines[i]; if (f.img || f.segs.length < 2 || f.segs.some(function (s) { return s.len > 70; })) return null; var an = f.segs.map(function (s) { return s.x1; }), rows = [f];
    for (var j = i + 1; j < lines.length; j++) { var l = lines[j], p = rows[rows.length - 1]; if (l.img || l.y - p.y > 2.4 * Math.max(l.size, p.size)) break; if (!l.segs.every(function (s) { return an.some(function (a) { return Math.abs(a - s.x1) < 10; }); }) || l.segs.some(function (s) { return s.len > 70; })) break; if (l.segs.length < 2 && Math.abs(an[0] - l.segs[0].x1) < 10) break; rows.push(l); }
    return rows.length >= 2 && rows.filter(function (r) { return r.segs.length >= 2; }).length >= 2 ? { rows: rows, an: an } : null;
  }
  function canJoin(P, n, g) {
    var p = P.lines[P.lines.length - 1]; if (p.img || n.img || p.segs.length !== 1 || n.segs.length !== 1) return false; var dy = n.y - p.y, sz = Math.max(p.size, n.size);
    if (dy < .6 * sz || dy > 1.62 * sz || Math.abs(n.size - p.size) > .12 * p.size || n.bold !== p.bold || isBullet(n)) return false;
    var cp = Math.abs((p.x1 + p.x2) / 2 - g.cc) < 7 && p.x1 > g.l + 2 * sz, cn = Math.abs((n.x1 + n.x2) / 2 - g.cc) < 7 && n.x1 > g.l + 2 * sz; if (cp !== cn) return false;
    if (p.x2 < g.l + .6 * (g.r - g.l) && !cp) return false;
    var ref = P.lines.length > 1 ? P.lines[1].x1 : P.lines[0].x1; if (!cp && n.x1 - ref > 1.2 * sz && p.x2 < g.r - .08 * (g.r - g.l)) return false; return true;
  }
  function build(an, W, H, M, ctx) {
    var lines = an.lines.slice(); an.imgs.forEach(function (im) { lines.push({ img: im, y: im.y1, x1: im.x1, x2: im.x1 + im.w, size: im.h, segs: [], bold: false, text: '' }); });
    lines.sort(function (a, b) { return a.y - b.y || a.x1 - b.x1; });
    var split = splitColumns(lines), ord = order(lines, split), cl = M.l, cr = W - M.r, blocks = [], i = 0;
    var top = function (l) { return l.img ? l.img.y1 : l.y - l.size * .9; }, bot = function (l) { return l.img ? l.img.y1 + l.img.h : l.y + l.size * .25; }, prev = null;
    function geom(ls) { var l = Math.min.apply(0, ls.map(function (x) { return x.x1; })), r = Math.max.apply(0, ls.map(function (x) { return x.x2; })); return { l: split != null && l > split - 6 ? split : (split != null && r < split + 6 ? cl : cl), r: split != null && l >= split - 6 ? cr : (split != null && r <= split + 6 ? split : cr), cc: 0 }; }
    var gcache = {}; function localGeom(l) {
      var key = Math.round(l.x1 / 8); if (gcache[key]) return gcache[key]; var arr = ord.filter(function (x) { return !x.img && x.x1 >= l.x1 - 40 && x.x1 <= l.x1 + 10 && x.x2 - x.x1 > 40; }), res = { l: cl, r: cr };
      if (arr.length >= 3) { var xs = arr.map(function (x) { return x.x2; }).sort(function (a, b) { return a - b; }); res = { l: Math.min.apply(0, arr.map(function (x) { return x.x1; })), r: xs[Math.floor(xs.length * .9)] }; } return (gcache[key] = res);
    }
    while (i < ord.length) {
      var l = ord[i], g = split != null ? geom([l]) : localGeom(l), g2 = { l: g.l, r: g.r, cc: (g.l + g.r) / 2, ri: split != null && g.r < cr - 1 ? cr - g.r + 8 : 0 }, before = prev ? Math.max(0, Math.min(40, top(l) - bot(prev) - (l.img ? 0 : l.size * .15))) : 0;
      if (l.img) { blocks.push({ k: 'img', img: l.img, before: before, al: (l.img.x1 + l.img.w / 2) > (g2.l + g2.r) / 2 + 30 ? 'right' : Math.abs(l.img.x1 + l.img.w / 2 - (g2.l + g2.r) / 2) < 20 ? 'center' : 'left', left: Math.max(0, l.img.x1 - g2.l) }); prev = l; i++; ctx.images++; continue; }
      var t = tableAt(ord, i); if (t && split == null) { blocks.push({ k: 'tbl', t: t, before: before, cl: cl, cr: cr }); prev = t.rows[t.rows.length - 1]; i += t.rows.length; ctx.tables++; continue; }
      var P = { lines: [l] }; i++; while (i < ord.length && canJoin(P, ord[i], g2)) { P.lines.push(ord[i]); i++; } prev = P.lines[P.lines.length - 1]; P.before = before; P.g = g2; blocks.push({ k: 'p', P: P, before: before, g: g2 });
    }
    return blocks;
  }

  /* ---------------- xml ---------------- */
  function runXml(r) {
    var p = '<w:rFonts w:ascii="' + esc(r.fam) + '" w:hAnsi="' + esc(r.fam) + '" w:eastAsia="' + esc(r.fam) + '" w:cs="' + esc(r.fam) + '"/>' + (r.b ? '<w:b/><w:bCs/>' : '') + (r.i ? '<w:i/><w:iCs/>' : '') + '<w:sz w:val="' + clamp(Math.round(r.size * 2), 2, 400) + '"/><w:szCs w:val="' + clamp(Math.round(r.size * 2), 2, 400) + '"/>';
    return String(r.t).split('\t').map(function (part, k) { return (k ? '<w:r><w:rPr>' + p + '</w:rPr><w:tab/></w:r>' : '') + (part ? '<w:r><w:rPr>' + p + '</w:rPr><w:t xml:space="preserve">' + esc(part) + '</w:t></w:r>' : ''); }).join('');
  }
  function paraXml(B, body, M, W, sect, rank) {
    var P = B.P, ls = P.lines, g = B.g, size = ls[0].size, pitch = ls.length > 1 ? (ls[ls.length - 1].y - ls[0].y) / (ls.length - 1) : size * 1.2, spLine = clamp(Math.round(pitch / (size * 1.15) * 240), 200, 480);
    var multi = ls.length === 1 && ls[0].segs.length > 1, restL = ls.length > 1 ? Math.min.apply(0, ls.slice(1).map(function (x) { return x.x1; })) : ls[0].x1, first = ls[0].x1 - restL, left = Math.max(0, restL - M.l);
    var cw = g.r - g.l, centered = ls.every(function (x) { return Math.abs((x.x1 + x.x2) / 2 - g.cc) < 7 && x.x1 > g.l + 2 * size; }), right = !centered && ls.every(function (x) { return x.x2 > g.r - 6 && x.x1 > g.l + .3 * cw; }), just = ls.length >= 3 && ls.slice(0, -1).every(function (x) { return Math.abs(x.x2 - g.r) < 6 && Math.abs(x.x1 - ls[0].x1) < 6 + Math.max(0, first); });
    var jc = centered ? 'center' : right ? 'right' : just ? 'both' : 'left', txt = '', runs = [];
    ls.forEach(function (L, k) { var rr = []; L.segs.forEach(function (s, si) { if (si) rr.push({ t: '\t', fam: s.runs[0].fam, b: 0, i: 0, size: L.size }); s.runs.forEach(function (r) { rr.push(r); }); }); if (k) { var lastR = runs[runs.length - 1]; if (lastR && !/[-\u2010]$/.test(lastR.t) && !/\s$/.test(lastR.t)) runs.push({ t: ' ', fam: lastR.fam, b: 0, i: 0, size: lastR.size }); } runs = runs.concat(rr); });
    var tabs = ''; if (multi) tabs = '<w:tabs>' + ls[0].segs.slice(1).map(function (s) { return '<w:tab w:val="left" w:pos="' + tw(s.x1 - M.l) + '"/>'; }).join('') + '</w:tabs>';
    var rI = g.ri || 0, lj = jc === 'left' || jc === 'both', ind = (lj && (left > 2 || first > 2 || first < -2)) || rI > 2 ? '<w:ind w:left="' + tw(lj ? left : 0) + '"' + (rI > 2 ? ' w:right="' + tw(rI) + '"' : '') + (lj && first > 2 ? ' w:firstLine="' + tw(first) + '"' : lj && first < -2 ? ' w:hanging="' + tw(-first) + '"' : '') + '/>' : '';
    var ol = rank != null ? '<w:outlineLvl w:val="' + rank + '"/>' : '';
    return '<w:p><w:pPr>' + tabs + '<w:spacing w:before="' + tw(B.before) + '" w:after="0" w:line="' + spLine + '" w:lineRule="auto"/>' + ind + '<w:jc w:val="' + jc + '"/>' + ol + (sect || '') + '</w:pPr>' + runs.map(runXml).join('') + '</w:p>';
  }
  function tblXml(B, M, W) {
    var t = B.t; t.rows.forEach(function (r, i) { var nx = t.rows[i + 1], pv = t.rows[i - 1]; r.pitch = nx ? nx.y - r.y : pv ? r.y - pv.y : r.size * 1.5; }); var an = t.an.slice().sort(function (a, b) { return a - b; }), maxR = Math.max.apply(0, t.rows.map(function (r) { return r.x2; })), cw = [], lim = W - M.r;
    an.forEach(function (a, k) { cw.push(tw(clamp((k < an.length - 1 ? an[k + 1] : Math.min(lim, maxR + 14)) - a, 24, W))); });
    var rows = t.rows.map(function (r) {
      var cells = an.map(function () { return []; }); r.segs.forEach(function (s) { var k = 0; an.forEach(function (a, j) { if (Math.abs(a - s.x1) < 10) k = j; }); cells[k].push(s); });
      return '<w:tr><w:trPr><w:trHeight w:val="' + tw(Math.max(10, r.pitch || r.size * 1.5)) + '" w:hRule="atLeast"/></w:trPr>' + cells.map(function (c, k) { var rr = []; c.forEach(function (s, si) { if (si) rr.push({ t: ' ', fam: 'Arial', b: 0, i: 0, size: r.size }); s.runs.forEach(function (x) { rr.push(x); }); }); return '<w:tc><w:tcPr><w:tcW w:w="' + cw[k] + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' + rr.map(runXml).join('') + '</w:p></w:tc>'; }).join('') + '</w:tr>';
    }).join('');
    var bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (n) { return '<w:' + n + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'; }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + cw.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblInd w:w="' + tw(Math.max(0, an[0] - M.l)) + '" w:type="dxa"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + cw.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + rows + '</w:tbl>';
  }
  function imgXml(B, rid, id, sect, M, W) {
    var w = Math.min(B.img.w, W - M.l - M.r), h = B.img.h * w / B.img.w;
    return '<w:p><w:pPr><w:spacing w:before="' + tw(B.before) + '" w:after="0"/>' + (B.left > 4 && B.al === 'left' ? '<w:ind w:left="' + tw(B.left) + '"/>' : '') + '<w:jc w:val="' + B.al + '"/>' + (sect || '') + '</w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + emu(w) + '" cy="' + emu(h) + '"/><wp:docPr id="' + id + '" name="Picture ' + id + '"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="image' + id + '.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emu(w) + '" cy="' + emu(h) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }
  var sectXml = function (W, H, M) { return '<w:sectPr><w:pgSz w:w="' + tw(W) + '" w:h="' + tw(H) + '"/><w:pgMar w:top="' + tw(M.t) + '" w:right="' + tw(M.r) + '" w:bottom="' + tw(M.b) + '" w:left="' + tw(M.l) + '" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>'; };
  var tinyP = function (sect) { return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr>' + (sect || '') + '</w:pPr></w:p>'; };

  /* ---------------- main ---------------- */
  async function convert(pdfjs, JSZip, file, opt, say) {
    var pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, n = pdf.numPages, media = [], ctx = { images: 0, tables: 0, scanned: 0 }, pagesXml = [], sizes = [];
    var an = []; for (var p = 1; p <= n; p++) { say(p + ' / ' + n); var pg = await pdf.getPage(p), r; try { r = await analyse(pdfjs, pg, opt, media); } catch (e) { r = { scan: true, W: pg.getViewport({ scale: 1 }).width, H: pg.getViewport({ scale: 1 }).height }; } if (r.scan) { try { r.pic = await renderCanvas(pg, 1.6); } catch (e) { r.pic = null; } } an.push(r); }
    var body = '', docId = 1;
    async function pictureXml(k, a, last) {
      var W = a.W, H = a.H, M = { l: 36, r: 36, t: 36, b: 36 }, s0 = sectXml(W, H, M), pic = a.pic; if (!pic) { try { pic = await renderCanvas(await pdf.getPage(k + 1), 1.6); } catch (e) { pic = null; } }
      var xml; if (pic) { media.push(await toPng(pic)); var wpt = W - 72, hpt = pic.height / pic.width * wpt; xml = imgXml({ img: { w: wpt, h: hpt }, before: 0, al: 'center', left: 0 }, 'rIdImg' + media.length, docId++, last ? '' : s0, M, W); } else xml = tinyP(last ? '' : s0);
      return xml + (last ? s0 : '');
    }
    async function textXml(k, a, last) {
      var W = a.W, H = a.H, xml = '', xs1 = a.lines.map(function (l) { return l.x1; }).sort(function (x, y) { return x - y; }), xs2 = a.lines.map(function (l) { return l.x2; }).sort(function (x, y) { return x - y; }), q = function (arr, f) { return arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * f)))]; };
      var first = a.lines[0], lastL = a.lines[a.lines.length - 1], M = { l: clamp(q(xs1, .02), 24, 150), r: clamp(W - q(xs2, .98), 24, 150), t: clamp(first.y - first.size * .9, 18, 150), b: clamp(H - lastL.y - 6, 18, 150) }, localCtx = { images: 0, tables: 0 }, mediaBefore = media.length;
      for (var ii = 0; ii < a.imgs.length; ii++) { media.push(await toPng(a.imgs[ii].c)); a.imgs[ii].rid = 'rIdImg' + media.length; }
      var blocks = build(a, W, H, M, localCtx), sizes2 = {}; blocks.forEach(function (b) { if (b.k === 'p') { var s = Math.round(b.P.lines[0].size * 2) / 2, c = b.P.lines.reduce(function (t, l) { return t + l.text.length; }, 0); sizes2[s] = (sizes2[s] || 0) + c; } });
      var bodySz = +Object.keys(sizes2).sort(function (x, y) { return sizes2[y] - sizes2[x]; })[0] || 11, big = Object.keys(sizes2).map(Number).filter(function (s) { return s >= bodySz * 1.25; }).sort(function (x, y) { return y - x; }), sect = sectXml(W, H, M);
      blocks.forEach(function (b, bi) {
        var isLast = bi === blocks.length - 1, sx = isLast && !last ? sect : '';
        if (b.k === 'p') { var sz = Math.round(b.P.lines[0].size * 2) / 2, ri = big.indexOf(sz), rank = ri > -1 && b.P.lines.length <= 3 ? Math.min(ri, 2) : null; xml += paraXml(b, body, M, W, sx, rank); }
        else if (b.k === 'img') xml += imgXml(b, b.img.rid, docId++, sx, M, W);
        else { xml += tblXml(b, M, W); if (isLast) xml += tinyP(last ? '' : sect); }
      });
      if (!blocks.length) xml = tinyP(last ? '' : sect); ctx.images += localCtx.images; ctx.tables += localCtx.tables; return xml + (last ? sect : '');
    }
    for (var k = 0; k < n; k++) {
      var a = an[k], last = k === n - 1;
      if (a.scan || !a.lines) { ctx.scanned++; body += await pictureXml(k, a, last); continue; }
      try { body += await textXml(k, a, last); } catch (e) { ctx.scanned++; body += await pictureXml(k, a, last); }
    }
    var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    var z = new JSZip(); z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(file.name.replace(/\.pdf$/i, '')) + '</dc:title><dc:creator>PSBM Labs PDF to Word</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>');
    z.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PSBM Labs</Application></Properties>');
    z.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>');
    z.file('word/settings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSe" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' + media.map(function (m, i) { return '<Relationship Id="rIdImg' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image' + (i + 1) + '.png"/>'; }).join('') + '</Relationships>');
    media.forEach(function (m, i) { z.file('word/media/image' + (i + 1) + '.png', m); });
    z.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body + '</w:body></w:document>');
    var blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
    return { blob: blob, pages: n, scanned: ctx.scanned, tables: ctx.tables, images: ctx.images };
  }
  window.PSBMPdf2Word = { convert: convert };
})();
