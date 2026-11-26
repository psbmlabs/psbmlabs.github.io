/* PSBM Labs PDF to Excel converter - runs 100% in the browser.
   Reuses the page analysis of pdf-to-word.js (pdf.js text + drawn table grids) and writes a real .xlsx with JSZip:
   cell values (numbers stay numbers), merged cells, fills, borders, fonts, colours, column widths and links. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var clean = function (s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ''); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var colName = function (n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }, ref = function (r, c) { return colName(c) + (r + 1); };

  /* ---------- styles ---------- */
  function makeStyles() {
    var fonts = ['<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>'], fontIdx = {}, fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], fillIdx = {},
      borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], borderIdx = {}, nfs = [], nfIdx = {}, xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], xfIdx = {};
    function font(f) { var k = JSON.stringify(f); if (fontIdx[k] !== undefined) return fontIdx[k]; fonts.push('<font>' + (f.b ? '<b/>' : '') + (f.i ? '<i/>' : '') + (f.st ? '<strike/>' : '') + (f.u ? '<u/>' : '') + '<sz val="' + f.sz + '"/><color rgb="FF' + (f.col || '000000') + '"/><name val="' + esc(f.name) + '"/></font>'); return (fontIdx[k] = fonts.length - 1); }
    function fill(c) { if (!c) return 0; if (fillIdx[c] !== undefined) return fillIdx[c]; fills.push('<fill><patternFill patternType="solid"><fgColor rgb="FF' + c + '"/><bgColor indexed="64"/></patternFill></fill>'); return (fillIdx[c] = fills.length - 1); }
    function border(c) { if (!c) return 0; if (borderIdx[c] !== undefined) return borderIdx[c]; var e = function (n) { return '<' + n + ' style="thin"><color rgb="FF' + c + '"/></' + n + '>'; }; borders.push('<border>' + e('left') + e('right') + e('top') + e('bottom') + '<diagonal/></border>'); return (borderIdx[c] = borders.length - 1); }
    function nf(code) { if (!code) return 0; if (nfIdx[code] !== undefined) return nfIdx[code]; nfs.push(code); return (nfIdx[code] = 163 + nfs.length); }
    function xf(o) {
      var key = JSON.stringify(o); if (xfIdx[key] !== undefined) return xfIdx[key]; var fid = o.font ? font(o.font) : 0, fl = fill(o.fill), bd = border(o.border), n = nf(o.nf);
      xfs.push('<xf numFmtId="' + n + '" fontId="' + fid + '" fillId="' + fl + '" borderId="' + bd + '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment' + (o.h ? ' horizontal="' + o.h + '"' : '') + ' vertical="' + (o.v || 'top') + '"' + (o.wrap ? ' wrapText="1"' : '') + '/></xf>'); return (xfIdx[key] = xfs.length - 1);
    }
    function xml() { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (nfs.length ? '<numFmts count="' + nfs.length + '">' + nfs.map(function (c, i) { return '<numFmt numFmtId="' + (164 + i) + '" formatCode="' + esc(c) + '"/>'; }).join('') + '</numFmts>' : '') + '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts><fills count="' + fills.length + '">' + fills.join('') + '</fills><borders count="' + borders.length + '">' + borders.join('') + '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'; }
    return { xf: xf, xml: xml };
  }

  /* ---------- values ---------- */
  function parseNum(t) {
    var s = t.trim(); if (!s || s.length > 24) return null; var neg = false, pct = false, cur = '';
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
    var m = /^([-\u2212+])?\s*([$\u20AC\u00A3\u09F3\u20B9]|BDT|USD|Tk\.?)?\s*([-\u2212])?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)\s*(%)?$/.exec(s); if (!m) return null;
    if (m[1] === '-' || m[1] === '\u2212' || m[3]) neg = true; cur = m[2] || ''; pct = !!m[5]; var raw = m[4], digits = raw.replace(/[.,]/g, '');
    if (/^0\d/.test(raw) && raw.indexOf('.') < 0 && raw.indexOf(',') < 0) return null; if (digits.length > 15) return null;
    var v = parseFloat(raw.replace(/,/g, '')); if (!isFinite(v)) return null; if (neg) v = -v; var dec = (raw.split('.')[1] || '').length, grp = raw.indexOf(',') > -1, code;
    if (pct) { v = v / 100; code = dec ? '0.' + new Array(dec + 1).join('0') + '%' : '0%'; } else { code = (grp ? '#,##0' : '0') + (dec ? '.' + new Array(dec + 1).join('0') : ''); if (cur) { var sym = /^(\$|\u20AC|\u00A3|\u09F3|\u20B9)$/.test(cur) ? cur : null; code = sym ? '"' + sym + '"' + (grp ? '#,##0' : '0') + (dec ? '.' + new Array(dec + 1).join('0') : '') : code; } }
    return { v: v, nf: code === '0' ? null : code };
  }
  function runStyle(r) { return { name: r.fam || 'Arial', sz: clamp(Math.round((r.size || 11) * 2) / 2, 6, 72), b: r.b ? 1 : 0, i: r.i ? 1 : 0, u: (r.u || r.link) ? 1 : 0, st: r.st ? 1 : 0, col: r.col || (r.link ? '0563C1' : null) }; }
  function paraRuns(P) { var runs = []; P.lines.forEach(function (L, k) { if (k && runs.length) { var l = runs[runs.length - 1]; if (!/[-\u2010]$/.test(l.t) && !/\s$/.test(l.t)) runs.push({ t: ' ', fam: l.fam, size: l.size }); } L.segs.forEach(function (sg, si) { if (si) runs.push({ t: ' ', fam: sg.runs[0].fam, size: L.size }); sg.runs.forEach(function (r) { runs.push(r); }); }); }); return runs; }

  /* cell builder: paragraphs -> {text|num, runs, style} */
  function makeCell(paras, opt, st, fillHex, borderHex, geom) {
    var paraTexts = paras.map(function (runs) { return runs.map(function (r) { return r.t; }).join(''); }), text = clean(paraTexts.join('\n')).replace(/[ \t]+\n/g, '\n').trim(); if (!text) return { s: st.xf({ fill: fillHex, border: borderHex }), empty: true };
    var all = [].concat.apply([], paras), dom = all.slice().sort(function (a, b) { return b.t.length - a.t.length; })[0] || {}, base = runStyle(dom), same = all.every(function (r) { return JSON.stringify(runStyle(r)) === JSON.stringify(base) || !r.t.trim(); }), linkRuns = all.filter(function (r) { return r.link; }), linkLen = linkRuns.reduce(function (n, r) { return n + r.t.length; }, 0), link = linkRuns.length && linkLen >= .6 * text.length ? linkRuns[0].link : null;
    var h = geom && geom.h, wrap = paras.length > 1 || /\n/.test(text) || !!(geom && geom.wrap), num = paras.length === 1 ? parseNum(text) : null;
    var cell = { s: st.xf({ font: base, fill: fillHex, border: borderHex, nf: num && num.nf, h: num ? (h === 'center' ? 'center' : null) : h, wrap: wrap }), link: link };
    if (num) { cell.n = num.v; return cell; } cell.t = text;
    if (!same) { var rich = []; paras.forEach(function (runs, pi) { if (pi) rich.push({ t: '\n', st: base }); runs.forEach(function (r) { if (r.t) rich.push({ t: clean(r.t), st: runStyle(r) }); }); }); cell.rich = rich; }
    return cell;
  }
  var richXml = function (rich) { return '<is>' + rich.map(function (r) { var f = r.st; return '<r><rPr><rFont val="' + esc(f.name) + '"/>' + (f.b ? '<b/>' : '') + (f.i ? '<i/>' : '') + (f.st ? '<strike/>' : '') + '<color rgb="FF' + (f.col || '000000') + '"/><sz val="' + f.sz + '"/>' + (f.u ? '<u/>' : '') + '</rPr><t xml:space="preserve">' + esc(r.t) + '</t></r>'; }).join('') + '</is>'; };

  /* ---------- sheet model ---------- */
  function Sheet(name) { this.name = name; this.rows = {}; this.heights = {}; this.merges = []; this.colW = []; this.maxR = -1; this.maxC = 0; this.links = []; }
  Sheet.prototype.put = function (r, c, cell) { (this.rows[r] = this.rows[r] || {})[c] = cell; this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c); };
  Sheet.prototype.xml = function (rels) {
    var self = this, rowsXml = '', hl = '';
    Object.keys(self.rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (r) {
      var cs = self.rows[r], ht = self.heights[r]; rowsXml += '<row r="' + (r + 1) + '"' + (ht ? ' ht="' + (Math.round(ht * 100) / 100) + '" customHeight="1"' : '') + '>';
      Object.keys(cs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
        var x = cs[c], a = ref(r, c); if (x.link) { rels.push(x.link); hl += '<hyperlink ref="' + a + '" r:id="rId' + rels.length + '"/>'; }
        if (x.n !== undefined) rowsXml += '<c r="' + a + '" s="' + x.s + '"><v>' + x.n + '</v></c>'; else if (x.t !== undefined) rowsXml += '<c r="' + a + '" s="' + x.s + '" t="inlineStr">' + (x.rich ? richXml(x.rich) : '<is><t xml:space="preserve">' + esc(x.t) + '</t></is>') + '</c>'; else rowsXml += '<c r="' + a + '" s="' + x.s + '"/>';
      }); rowsXml += '</row>';
    });
    var cols = self.colW.length ? '<cols>' + self.colW.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (Math.round(w * 100) / 100) + '" customWidth="1"/>'; }).join('') + '</cols>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' + ref(Math.max(0, self.maxR), self.maxC) + '"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>' + cols + '<sheetData>' + rowsXml + '</sheetData>' + (self.merges.length ? '<mergeCells count="' + self.merges.length + '">' + self.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') + (hl ? '<hyperlinks>' + hl + '</hyperlinks>' : '') + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="' + (self.maxC > 7 ? 'landscape' : 'portrait') + '" fitToWidth="1" fitToHeight="0"/></worksheet>';
  };
  var wOf = function (pt) { return Math.max(3, pt * .19 + .7); };

  /* ---------- page -> blocks ---------- */
  function pageBlocks(P2W, a, opt) {
    var blocks = [], lines = a.lines.slice().sort(function (x, y) { return x.y - y.y || x.x1 - y.x1; }), i = 0;
    (a.grids || []).forEach(function (g) { blocks.push({ k: 'rt', g: g, y: g.y1 }); });
    while (i < lines.length) { var t = P2W.tableAt(lines, i); if (t) { blocks.push({ k: 'bt', t: t, y: t.rows[0].y - t.rows[0].size }); i += t.rows.length; } else { if (opt.text) blocks.push({ k: 'ln', L: lines[i], y: lines[i].y - lines[i].size }); i++; } }
    return blocks.sort(function (x, y) { return x.y - y.y; });
  }
  function cellParas(P2W, lines, x1, x2, y1) { var f = P2W.flow(lines || [], { l: x1, r: x2 }, y1, false, { images: 0, tables: 0 }); return f.blocks.filter(function (b) { return b.k === 'p'; }).map(function (b) { return paraRuns(b.P); }); }
  function hAlign(lines, x1, x2) { if (!lines || !lines.length) return null; var cc = (x1 + x2) / 2, ctr = lines.every(function (L) { return Math.abs((L.x1 + L.x2) / 2 - cc) < 6 && L.x1 > x1 + 8; }), rt = lines.every(function (L) { return L.x2 > x2 - 8 && L.x1 > x1 + .3 * (x2 - x1); }); return ctr ? 'center' : rt ? 'right' : null; }

  function dedupe(xs, tol) { var s = xs.slice().sort(function (a, b) { return a - b; }), o = []; s.forEach(function (v) { if (!o.length || v - o[o.length - 1] > tol) o.push(v); }); return o; }
  function colIndex(B, x) { var j = 0; for (var k = 0; k < B.length; k++) if (B[k] <= x + 3) j = k; return j; }

  function buildPageSheet(P2W, a, name, opt, st, stats) {
    var blocks = pageBlocks(P2W, a, opt); if (!blocks.length) return null; var xsAll = [], lineX1 = [], maxX2 = 0;
    blocks.forEach(function (b) { if (b.k === 'rt') { xsAll = xsAll.concat(b.g.xs); maxX2 = Math.max(maxX2, b.g.x2); } else if (b.k === 'bt') { var r2 = Math.max.apply(0, b.t.rows.map(function (r) { return r.x2; })) + 4; xsAll = xsAll.concat(b.t.an, [r2]); maxX2 = Math.max(maxX2, r2); } else { lineX1.push(b.L.x1); maxX2 = Math.max(maxX2, b.L.x2 + 2); } });
    if (lineX1.length) { var mn = Math.min.apply(0, lineX1); if (!xsAll.length || mn < Math.min.apply(0, xsAll) - 3) xsAll.push(mn); } if (!xsAll.length || maxX2 > Math.max.apply(0, xsAll) + 3) xsAll.push(maxX2);
    var B = dedupe(xsAll, 3), sh = new Sheet(name), row = 0, prevBottom = null;
    sh.colW = B.slice(0, -1).map(function (v, i) { return wOf(B[i + 1] - v); }); if (!sh.colW.length) sh.colW = [30];
    blocks.forEach(function (b) {
      if (prevBottom !== null && b.k !== 'ln' && b.y - prevBottom > 4) row++; else if (prevBottom !== null && b.k === 'ln' && b.y - prevBottom > 14) row++;
      if (b.k === 'ln') {
        var L = b.L, used = {}; L.segs.forEach(function (sg) { var c = colIndex(B, sg.x1), runs = sg.runs; if (used[c] !== undefined) { var prev = sh.rows[row][c]; if (prev && prev.t !== undefined) { prev.t += ' ' + runs.map(function (r) { return r.t; }).join(''); return; } } used[c] = 1; sh.put(row, c, makeCell([runs], opt, st, null, null, null)); });
        sh.heights[row] = clamp(L.size * 1.35, 12, 60); prevBottom = L.y + L.size * .3; row++; return;
      }
      if (b.k === 'bt') {
        var t = b.t, an = t.an.slice().sort(function (p, q) { return p - q; }); stats.tables++;
        t.rows.forEach(function (r, ri) { var cells = an.map(function () { return []; }); r.segs.forEach(function (sg) { var k = 0; an.forEach(function (x, j) { if (Math.abs(x - sg.x1) < 10) k = j; }); cells[k].push(sg.runs); });
          cells.forEach(function (rs, k) { var c0 = colIndex(B, an[k]), runs = [].concat.apply([], rs.map(function (x, q) { return q ? [{ t: ' ', fam: x[0].fam, size: r.size }].concat(x) : x; })); sh.put(row, c0, makeCell(runs.length ? [runs] : [], opt, st, null, null, null)); });
          sh.heights[row] = clamp(r.size * 1.45, 12, 80); row++; }); prevBottom = t.rows[t.rows.length - 1].y; return;
      }
      var g = b.g, map = g.xs.map(function (x) { return colIndex(B, x); }); stats.tables++; var r0 = row, bcol = g.color;
      g.cells.forEach(function (c) {
        var c0 = map[c.c], c1 = map[c.c + c.cs] - 1; if (c1 < c0) c1 = c0; var rr0 = r0 + c.r, rr1 = rr0 + (c.owner ? 0 : c.rs - 1), cell;
        if (c.owner) cell = { s: st.xf({ fill: c.bg, border: bcol }), empty: true }; else { var paras = cellParas(P2W, c.lines, c.x1 + 3, c.x2 - 3, c.y1); cell = makeCell(paras, opt, st, c.bg, bcol, { h: hAlign(c.lines, c.x1, c.x2), wrap: true }); }
        sh.put(rr0, c0, cell); if (!c.owner && (c1 > c0 || rr1 > rr0)) { sh.merges.push(ref(rr0, c0) + ':' + ref(rr1, c1)); for (var y = rr0; y <= rr1; y++) for (var x = c0; x <= c1; x++) if (y !== rr0 || x !== c0) { sh.put(y, x, { s: st.xf({ fill: c.bg, border: bcol }), empty: true }); } }
        else if (c.owner) { for (var xx = c0; xx <= c1; xx++) if (!(sh.rows[rr0] && sh.rows[rr0][xx])) sh.put(rr0, xx, { s: st.xf({ fill: c.bg, border: bcol }), empty: true }); }
      });
      for (var q = 0; q < g.nr; q++) sh.heights[r0 + q] = clamp((g.ys[q + 1] - g.ys[q]) * .75 * (1 / .75) , 8, 300); row = r0 + g.nr; prevBottom = g.y2;
    });
    return sh;
  }
  /* one table per sheet */
  function tableSheets(P2W, a, pageNo, opt, st, stats, out) {
    var n = 0; pageBlocks(P2W, a, { text: false }).forEach(function (b) {
      if (b.k === 'ln') return; var sub = { lines: [], grids: [], imgs: [] }; n++; var nm = 'P' + pageNo + ' Table ' + n;
      var one = buildTable(P2W, b, nm, opt, st, stats); if (one) out.push(one);
    });
  }
  function buildTable(P2W, b, name, opt, st, stats) {
    var fake = { lines: [], grids: [] }, sh;
    if (b.k === 'rt') { fake.grids = [b.g]; sh = buildPageSheet(P2W, fake, name, { text: false }, st, stats); }
    else { var L = [].concat(b.t.rows); fake.lines = L; sh = buildPageSheet(P2W, fake, name, { text: false }, st, stats); }
    return sh;
  }

  /* ---------- main ---------- */
  async function convert(pdfjs, JSZip, P2W, file, opt, say) {
    var pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, n = pdf.numPages, st = makeStyles(), sheets = [], stats = { tables: 0, scanned: 0, text: 0 }, scanned = 0;
    for (var k = 0; k < n; k++) {
      say((k + 1) + ' / ' + n); var a; try { a = await P2W.analyse(pdfjs, await pdf.getPage(k + 1), { images: false }); } catch (e) { a = { scan: true }; }
      if (a.scan || !a.lines) { scanned++; continue; }
      try { if (opt.mode === 'table') tableSheets(P2W, a, k + 1, opt, st, stats, sheets); else { var sh = buildPageSheet(P2W, a, 'Page ' + (k + 1), opt, st, stats); if (sh) sheets.push(sh); } } catch (e) { scanned++; }
    }
    if (opt.mode === 'table' && !sheets.length) { for (var k2 = 0; k2 < n; k2++) { var a2; try { a2 = await P2W.analyse(pdfjs, await pdf.getPage(k2 + 1), { images: false }); } catch (e) { continue; } if (a2.scan || !a2.lines) continue; var sh2 = buildPageSheet(P2W, a2, 'Page ' + (k2 + 1), { text: true }, st, stats); if (sh2) sheets.push(sh2); } stats.fallback = true; }
    if (!sheets.length) return { empty: true, pages: n, scanned: scanned };
    var names = {}; sheets.forEach(function (s, i) { var nm = s.name.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet' + (i + 1); while (names[nm.toLowerCase()]) nm = (nm.slice(0, 27) + ' ' + (i + 1)).slice(0, 31); names[nm.toLowerCase()] = 1; s.name = nm; });
    var z = new JSZip(), rels = [], sheetXmls = sheets.map(function (s) { var r = []; var x = s.xml(r); rels.push(r); return x; });
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(file.name.replace(/\.pdf$/i, '')) + '</dc:title><dc:creator>PSBM Labs PDF to Excel</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>');
    z.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file('xl/styles.xml', st.xml());
    sheetXmls.forEach(function (x, i) { z.file('xl/worksheets/sheet' + (i + 1) + '.xml', x); if (rels[i].length) z.file('xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels[i].map(function (u, j) { return '<Relationship Id="rId' + (j + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + esc(u) + '" TargetMode="External"/>'; }).join('') + '</Relationships>'); });
    var blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
    return { blob: blob, pages: n, sheets: sheets.length, tables: stats.tables, scanned: scanned, fallback: !!stats.fallback };
  }
  window.PSBMPdf2Excel = { convert: convert };
})();
