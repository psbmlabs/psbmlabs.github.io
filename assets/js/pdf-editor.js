/* PSBM Labs PDF Editor - runs 100% in the browser. pdf-lib (MIT) + pdf.js (Apache-2.0) + @pdf-lib/fontkit (MIT). Files are never uploaded. */
(function () {
  'use strict';
  var BN = document.documentElement.classList.contains('lang-bn'), T = function (e, b) { return BN ? b : e; };
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/', LIBS = { pdflib: CDN + 'pdf-lib/1.17.1/pdf-lib.min.js', pdfjs: CDN + 'pdf.js/3.11.174/pdf.min.js', fontkit: 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js' }, got = {};
  function load(k) { return got[k] || (got[k] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = LIBS[k]; s.onload = function () { if (k === 'pdfjs') pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + 'pdf.js/3.11.174/pdf.worker.min.js'; ok(); }; s.onerror = function () { got[k] = 0; no(new Error('lib')); }; document.head.appendChild(s); })); }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function dl(b, n) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = n; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  function div(c) { var d = document.createElement('div'); d.className = c || ''; return d; }
  function hex2rgb(h) { var n = parseInt(String(h).replace('#', ''), 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
  var FAM = { helv: 'Helvetica,Arial,sans-serif', times: '"Times New Roman",Times,serif', cour: '"Courier New",Courier,monospace', custom: 'psbm-custom,sans-serif' };
  var STD = { helv: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'], times: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'], cour: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'] };

  function mount(root) {
    var S = { objs: [], imgs: {}, hist: [], hi: -1, cur: 1, z: 1.3, mode: 'edit', sel: null, texts: {}, els: {}, wm: 0, tok: 0, dpr: window.devicePixelRatio || 1, fontBytes: null, uid: 1, pw: [], ph: [] };
    root.innerHTML = '<div class="pe-empty"><div class="pe-drop" tabindex="0" role="button"><div class="pt-ic">\u270E</div><div>' + T('Drop a PDF here or click to choose', 'একটা PDF এখানে ছাড়ুন বা ক্লিক করে বেছে নিন') + '</div><small>' + T('Your file stays on your device. Nothing is uploaded.', 'আপনার ফাইল আপনার ডিভাইসেই থাকে। কিছুই আপলোড হয় না।') + '</small></div></div>' +
      '<div class="pe-app" hidden><div class="pe-bar"><button data-m="edit">\u270E ' + T('Edit text', 'লেখা এডিট') + '</button><button data-m="text">T ' + T('Add text', 'লেখা যোগ') + '</button><button data-m="img">\u25A3 ' + T('Add image', 'ছবি যোগ') + '</button><button data-m="sig">\u2712 ' + T('Signature', 'সিগনেচার') + '</button><button data-m="cover">\u25AD ' + T('Cover / Erase', 'ঢাকুন / মুছুন') + '</button><span class="sp"></span><button id="un" title="Undo">\u21B6</button><button id="re" title="Redo">\u21B7</button><button id="zm">\u2212</button><span id="zl"></span><button id="zp">+</button><button id="pv">\u25C0</button><span id="pl"></span><button id="nx">\u25B6</button><button id="op">' + T('Open other', 'অন্য ফাইল') + '</button><button class="pe-dl" id="dlb">\u2B07 ' + T('Download PDF', 'PDF ডাউনলোড') + '</button></div>' +
      '<div class="pe-props" id="pp"></div><div class="pe-wm"><b>' + T('Watermark', 'ওয়াটারমার্ক') + ':</b> <button id="wms">' + T('Scan for removable watermark', 'সরানো যায় এমন ওয়াটারমার্ক খুঁজুন') + '</button> <label><input type="checkbox" id="wmc"> ' + T('Remove it when I download', 'ডাউনলোডের সময় সরিয়ে দিন') + '</label> <span id="wmm"></span></div>' +
      '<div class="pe-main"><div class="pe-side" id="sd"></div><div class="pe-stage" id="st"><div class="pe-page m-edit" id="pg"><canvas id="cv"></canvas><div id="ti"></div><div id="ly"></div></div></div></div><div class="pe-msg" id="mg" aria-live="polite"></div>' +
      '<p class="pt-sm">' + T('Use this only on files you own or have permission to edit. Edited text is placed over the original; to remove hidden text for good, print the result to a new PDF.', 'শুধু নিজের বা অনুমতি পাওয়া ফাইলে ব্যবহার করুন। এডিট করা লেখা আসল লেখার ওপর বসে; লুকানো লেখা পুরোপুরি মুছতে ফলাফল নতুন PDF হিসেবে প্রিন্ট করুন।') + '</p></div>' +
      '<input type="file" id="fp" hidden accept=".pdf,application/pdf"><input type="file" id="fi" hidden accept="image/*"><input type="file" id="ff" hidden accept=".ttf,.otf">';
    var $ = function (s) { return root.querySelector(s); }, cv = $('#cv'), pgEl = $('#pg'), ly = $('#ly'), tiEl = $('#ti'), mg = $('#mg');
    var say = function (t, bad) { mg.textContent = t || ''; mg.className = 'pe-msg' + (bad ? ' bad' : ''); };
    var uid = function () { return 'o' + (S.uid++); };

    /* ---------- opening ---------- */
    var drop = $('.pe-drop'), fp = $('#fp');
    drop.onclick = function () { fp.click(); }; $('#op').onclick = function () { fp.click(); };
    drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fp.click(); } };
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('on'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) openFile(e.dataTransfer.files[0]); });
    fp.onchange = function () { if (fp.files[0]) openFile(fp.files[0]); fp.value = ''; };
    async function openFile(f) {
      say(T('Opening...', 'খোলা হচ্ছে...'));
      try {
        await load('pdflib'); await load('pdfjs'); var bytes = await f.arrayBuffer(), d = await PDFLib.PDFDocument.load(bytes.slice(0)), rot = 0;
        S.bytes = bytes; S.name = f.name.replace(/\.pdf$/i, ''); S.pw = []; S.ph = [];
        d.getPages().forEach(function (p) { var s = p.getSize(), a = p.getRotation().angle % 180; if (p.getRotation().angle) rot = 1; S.pw.push(a ? s.height : s.width); S.ph.push(a ? s.width : s.height); });
        S.pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise; S.n = S.pdf.numPages; S.objs = []; S.texts = {}; S.imgs = {}; S.hist = []; S.hi = -1; S.sel = null; S.cur = 1; commit();
        $('.pe-empty').hidden = true; $('.pe-app').hidden = false; buildThumbs(); setMode('edit'); await show(1); props(); say(rot ? T('Some pages are rotated. Positions may look different after download; fix rotation first with Organize PDF Pages.', 'কিছু পেজ ঘোরানো। ডাউনলোডের পর অবস্থান ভিন্ন হতে পারে; আগে Organize PDF Pages দিয়ে রোটেশন ঠিক করুন।') : '', rot);
      } catch (e) { say(/password|encrypt/i.test(String(e && (e.message || e.name))) ? T('This PDF is password-protected.', 'এই PDF পাসওয়ার্ড-সুরক্ষিত।') : e.message === 'lib' ? T('Could not load the PDF engine. Check your internet connection.', 'PDF ইঞ্জিন লোড হয়নি। ইন্টারনেট দেখুন।') : T('Could not open this PDF.', 'এই PDF খোলা যায়নি।'), 1); }
    }

    /* ---------- rendering ---------- */
    async function show(n) {
      S.cur = n; var tok = ++S.tok, pg = await S.pdf.getPage(n), z = S.z, d = S.dpr, vp = pg.getViewport({ scale: z * d });
      cv.width = vp.width; cv.height = vp.height; var w = vp.width / d, h = vp.height / d; cv.style.width = pgEl.style.width = w + 'px'; cv.style.height = pgEl.style.height = h + 'px';
      var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: x, canvas: cv, viewport: vp }).promise; if (tok !== S.tok) return;
      if (!S.texts[n]) S.texts[n] = await items(pg, n); if (tok !== S.tok) return;
      $('#zl').textContent = Math.round(z * 100) + '%'; $('#pl').textContent = n + ' / ' + S.n; drawTI(); drawObjs();
      [].forEach.call(root.querySelectorAll('.pe-th'), function (t) { t.classList.toggle('on', +t.dataset.n === n); });
    }
    async function items(pg, n) {
      var tc = await pg.getTextContent(), ph = S.ph[n - 1], out = [];
      tc.items.forEach(function (it, k) { var s = it.str; if (!s || !s.trim()) return; var tr = it.transform; if (Math.abs(tr[1]) > .01 || Math.abs(tr[2]) > .01) return; var size = Math.abs(tr[3]) || it.height; if (!size) return; var fn = ''; try { var o = pg.commonObjs.has(it.fontName) ? pg.commonObjs.get(it.fontName) : null; fn = (o && o.name) || ''; } catch (e) { } out.push({ k: k, s: s, x: tr[4], base: ph - tr[5], size: size, w: it.width, fn: fn }); });
      return out;
    }
    function drawTI() {
      tiEl.innerHTML = ''; var z = S.z; (S.texts[S.cur] || []).forEach(function (it) { var d = div('pe-ti'); d.style.cssText = 'left:' + (it.x * z - 1) + 'px;top:' + ((it.base - it.size * .85) * z) + 'px;width:' + (it.w * z + 2) + 'px;height:' + (it.size * 1.12 * z) + 'px'; d.onpointerdown = function (e) { e.stopPropagation(); editFrom(it); }; tiEl.appendChild(d); });
    }
    function buildThumbs() {
      var sd = $('#sd'); sd.innerHTML = ''; var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); thumb(e.target); } }); }, { root: sd }) : null;
      for (var i = 1; i <= S.n; i++) { var t = div('pe-th'); t.dataset.n = i; t.innerHTML = '<canvas></canvas><b>' + i + '</b>'; t.onclick = (function (k) { return function () { show(k); }; })(i); sd.appendChild(t); if (io) io.observe(t); else thumb(t); }
    }
    async function thumb(t) { try { var pg = await S.pdf.getPage(+t.dataset.n), vp = pg.getViewport({ scale: .17 }), c = t.querySelector('canvas'); c.width = vp.width; c.height = vp.height; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, canvas: c, viewport: vp }).promise; } catch (e) { } }

    /* ---------- objects ---------- */
    function commit() { S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(JSON.stringify(S.objs)); if (S.hist.length > 60) S.hist.shift(); S.hi = S.hist.length - 1; }
    function undo(d) { var k = S.hi + d; if (k < 0 || k >= S.hist.length) return; S.hi = k; S.objs = JSON.parse(S.hist[k]); S.sel = null; drawObjs(); props(); }
    function byId(id) { return S.objs.filter(function (o) { return o.id === id; })[0]; }
    function vis(o) { return o.all || o.page === S.cur; }
    function css(o) { return 'font-size:' + (o.size * S.z) + 'px;font-family:' + FAM[o.font] + ';font-weight:' + (o.b ? 700 : 400) + ';font-style:' + (o.i ? 'italic' : 'normal') + ';color:' + o.color; }
    function place(o) { var e = S.els[o.id]; if (!e) return; var z = S.z; e.root.style.left = o.x * z + 'px'; e.root.style.top = o.y * z + 'px'; if (o.t !== 'text') { e.root.style.width = o.w * z + 'px'; e.root.style.height = o.h * z + 'px'; } else if (!o.nowrap) e.root.style.width = o.w * z + 'px'; }
    function drawObjs() {
      ly.innerHTML = ''; S.els = {}; var z = S.z;
      S.objs.forEach(function (o) {
        if (!vis(o)) return; var r = div('pe-o t-' + o.t + (S.sel === o.id ? ' sel' : '')), e = { root: r };
        if (o.t === 'text' && o.cov) { var cvr = div('pe-cv'); cvr.style.cssText = 'left:' + o.cov.x * z + 'px;top:' + o.cov.y * z + 'px;width:' + o.cov.w * z + 'px;height:' + o.cov.h * z + 'px;background:' + o.cov.c; ly.appendChild(cvr); e.cv = cvr; }
        if (o.t === 'text') { var tx = div('pe-tx'); tx.contentEditable = 'true'; tx.spellcheck = false; tx.textContent = o.txt; tx.style.cssText = css(o) + ';white-space:' + (o.nowrap ? 'pre' : 'pre-wrap') + ';min-width:' + (24 * z) + 'px'; tx.oninput = function () { o.txt = tx.innerText.replace(/\n$/, ''); }; tx.onfocus = function () { sel(o.id, 1); }; tx.onblur = function () { commit(); }; r.appendChild(tx); e.tx = tx; }
        else if (o.t === 'img') { var im = document.createElement('img'); im.src = S.imgs[o.src].url; im.draggable = false; r.appendChild(im); if (o.cover) r.style.background = '#fff'; }
        else { r.style.background = o.c; }
        if (o.t !== 'text') r.onpointerdown = function (e) { sel(o.id); startDrag(e, o, 'move'); };
        var mv = div('pe-mv'); mv.title = 'Move'; mv.onpointerdown = function (e) { sel(o.id, 1); startDrag(e, o, 'move'); }; r.appendChild(mv);
        if (o.t !== 'text' || !o.nowrap) { var rz = div('pe-rz'); rz.onpointerdown = function (e) { sel(o.id, 1); startDrag(e, o, 'size'); }; r.appendChild(rz); }
        ly.appendChild(r); S.els[o.id] = e; place(o);
      });
    }
    function sel(id, keep) { if (S.sel === id) return; S.sel = id; [].forEach.call(ly.querySelectorAll('.pe-o'), function (x) { x.classList.remove('sel'); }); var e = S.els[id]; if (e) e.root.classList.add('sel'); props(); }
    function startDrag(e, o, kind) {
      e.preventDefault(); e.stopPropagation(); var sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y, ow = o.w, oh = o.h, z = S.z;
      function mv(ev) { var dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z; if (kind === 'move') { o.x = ox + dx; o.y = oy + dy; } else { var nw = Math.max(8, ow + dx); if (o.t === 'img') { o.w = nw; o.h = nw * o.ar; } else if (o.t === 'cover') { o.w = nw; o.h = Math.max(4, oh + dy); } else o.w = nw; } place(o); }
      function up() { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); commit(); }
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    }
    function remove(id) { S.objs = S.objs.filter(function (o) { return o.id !== id; }); S.sel = null; commit(); drawObjs(); props(); }

    /* ---------- edit existing text ---------- */
    function sample(it) {
      var k = S.z * S.dpr, x0 = it.x * k, y0 = (it.base - it.size * .85) * k, w = Math.max(2, it.w * k), h = Math.max(2, it.size * 1.12 * k), c = cv.getContext('2d'), W = cv.width, H = cv.height;
      function px(x, y) { x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y))); return c.getImageData(x, y, 1, 1).data; }
      try {
        var p = [px(x0 - 3, y0 + h / 2), px(x0 + w + 3, y0 + h / 2), px(x0 + w / 2, y0 - 3), px(x0 + w / 2, y0 + h + 3)], bg = [0, 1, 2].map(function (i) { var a = p.map(function (q) { return q[i]; }).sort(function (a, b) { return a - b; }); return a[1]; });
        var rx = Math.max(0, Math.round(x0)), ry = Math.max(0, Math.round(y0)), rw = Math.min(W - rx, Math.round(w)), rh = Math.min(H - ry, Math.round(h)), dat = c.getImageData(rx, ry, rw, rh).data, best = 0, fg = [0, 0, 0];
        for (var i = 0; i < dat.length; i += 16) { var d = Math.abs(dat[i] - bg[0]) + Math.abs(dat[i + 1] - bg[1]) + Math.abs(dat[i + 2] - bg[2]); if (d > best) { best = d; fg = [dat[i], dat[i + 1], dat[i + 2]]; } }
        return { bg: rgb2hex(bg[0], bg[1], bg[2]), fg: best < 90 ? '#000000' : rgb2hex(fg[0], fg[1], fg[2]) };
      } catch (er) { return { bg: '#ffffff', fg: '#000000' }; }
    }
    function editFrom(it) {
      var ex = S.objs.filter(function (o) { return o.page === S.cur && o.ti === it.k; })[0]; if (ex) { sel(ex.id); focusTx(ex.id); return; }
      var sm = sample(it), fn = it.fn || '', o = { id: uid(), t: 'text', page: S.cur, all: 0, ti: it.k, x: it.x, y: it.base - .95 * it.size, w: Math.max(it.w, 10), size: Math.round(it.size * 10) / 10, font: /courier|mono|consol/i.test(fn) ? 'cour' : /times|serif|georgia|garamond|minion|cambria/i.test(fn) && !/sans/i.test(fn) ? 'times' : 'helv', b: /bold|black|heavy|semibold/i.test(fn), i: /italic|oblique/i.test(fn), color: sm.fg, txt: it.s, nowrap: 1, cov: { x: it.x - 1, y: it.base - .85 * it.size, w: it.w + 2, h: it.size * 1.12, c: sm.bg } };
      S.objs.push(o); commit(); S.sel = o.id; drawObjs(); props(); focusTx(o.id);
    }
    function focusTx(id) { setTimeout(function () { var e = S.els[id]; if (e && e.tx) { e.tx.focus(); var r = document.createRange(); r.selectNodeContents(e.tx); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } }, 40); }

    /* ---------- modes & page clicks ---------- */
    function setMode(m) { S.mode = m; pgEl.className = 'pe-page m-' + m; [].forEach.call(root.querySelectorAll('.pe-bar [data-m]'), function (b) { b.classList.toggle('on', b.dataset.m === m); }); }
    [].forEach.call(root.querySelectorAll('.pe-bar [data-m]'), function (b) { b.onclick = function () { var m = b.dataset.m; if (m === 'img') $('#fi').click(); else if (m === 'sig') sigModal(); else setMode(m); }; });
    pgEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pe-o,.pe-ti')) return; var r = pgEl.getBoundingClientRect(), x = (e.clientX - r.left) / S.z, y = (e.clientY - r.top) / S.z;
      if (S.mode === 'text') { var o = { id: uid(), t: 'text', page: S.cur, all: 0, x: x, y: y - 8, w: 200, size: 14, font: 'helv', b: 0, i: 0, color: '#000000', txt: '', nowrap: 0 }; S.objs.push(o); commit(); S.sel = o.id; drawObjs(); props(); setMode('edit'); focusTx(o.id); }
      else if (S.mode === 'cover') {
        e.preventDefault(); var o2 = { id: uid(), t: 'cover', page: S.cur, all: 0, x: x, y: y, w: 1, h: 1, c: '#ffffff' }; S.objs.push(o2); S.sel = o2.id; drawObjs();
        var mv = function (ev) { o2.w = Math.max(1, (ev.clientX - r.left) / S.z - x); o2.h = Math.max(1, (ev.clientY - r.top) / S.z - y); place(o2); };
        var up = function () { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (o2.w < 4 || o2.h < 4) { S.objs.pop(); S.sel = null; drawObjs(); return; } var s = sample({ x: o2.x - 4, base: o2.y + o2.h * .85 + 0, size: o2.h / 1.12, w: o2.w + 8 }); o2.c = s.bg; commit(); drawObjs(); props(); setMode('edit'); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up);
      } else if (S.sel) { S.sel = null; drawObjs(); props(); }
    });
    addEventListener('keydown', function (e) { if (!root.isConnected || $('.pe-app').hidden) return; var ed = document.activeElement && document.activeElement.isContentEditable; if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel && !ed && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); remove(S.sel); } if ((e.ctrlKey || e.metaKey) && !ed && /^[zy]$/i.test(e.key)) { e.preventDefault(); undo(e.key.toLowerCase() === 'z' && !e.shiftKey ? -1 : 1); } });

    /* ---------- properties bar ---------- */
    function props() {
      var p = $('#pp'), o = S.sel && byId(S.sel); if (!o) { p.innerHTML = '<span class="pt-sm">' + T('Click any text on the page to edit it, or pick a tool above.', 'পেজের যেকোনো লেখায় ক্লিক করে এডিট করুন, অথবা উপরের টুল বেছে নিন।') + '</span>'; return; }
      var h = '';
      if (o.t === 'text') h += '<select id="pf">' + [['helv', 'Helvetica'], ['times', 'Times'], ['cour', 'Courier'], ['custom', T('Custom font...', 'নিজের ফন্ট...')]].map(function (f) { return '<option value="' + f[0] + '"' + (o.font === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select><button id="pb" class="' + (o.b ? 'on' : '') + '"><b>B</b></button><button id="pi" class="' + (o.i ? 'on' : '') + '"><i>I</i></button><label>' + T('Size', 'সাইজ') + ' <input id="ps" type="number" min="4" max="200" step="0.5" value="' + o.size + '"></label><label>' + T('Color', 'রঙ') + ' <input id="pc" type="color" value="' + o.color + '"></label>' + (o.cov ? '<label>' + T('Background', 'ব্যাকগ্রাউন্ড') + ' <input id="pbg" type="color" value="' + o.cov.c + '"></label>' : '');
      if (o.t === 'cover') h += '<label>' + T('Fill color', 'ভরাট রঙ') + ' <input id="pbg" type="color" value="' + o.c + '"></label>';
      if (o.t === 'img') h += '<label><input id="pcv" type="checkbox"' + (o.cover ? ' checked' : '') + '> ' + T('White behind image (hides old image)', 'ছবির পেছনে সাদা (পুরনো ছবি ঢাকে)') + '</label>';
      h += '<label><input id="pal" type="checkbox"' + (o.all ? ' checked' : '') + '> ' + T('Every page', 'সব পেজে') + '</label><button id="pd" class="pe-del">\u2715 ' + T('Delete', 'মুছুন') + '</button>'; p.innerHTML = h;
      var g = function (i) { return p.querySelector(i); }, ch = function () { drawObjs(); commit(); };
      if (g('#pf')) g('#pf').onchange = function () { if (this.value === 'custom' && !S.fontBytes) { var v = this; $('#ff').click(); $('#ff').onchange = async function () { var f = this.files[0]; if (!f) { v.value = o.font; return; } S.fontBytes = await f.arrayBuffer(); try { var ff = new FontFace('psbm-custom', S.fontBytes.slice(0)); await ff.load(); document.fonts.add(ff); } catch (e) { } o.font = 'custom'; ch(); props(); this.value = ''; }; return; } o.font = this.value; ch(); };
      if (g('#pb')) g('#pb').onclick = function () { o.b = o.b ? 0 : 1; ch(); props(); }; if (g('#pi')) g('#pi').onclick = function () { o.i = o.i ? 0 : 1; ch(); props(); };
      if (g('#ps')) g('#ps').onchange = function () { o.size = Math.max(4, +this.value || o.size); ch(); }; if (g('#pc')) g('#pc').onchange = function () { o.color = this.value; ch(); };
      if (g('#pbg')) g('#pbg').onchange = function () { if (o.t === 'cover') o.c = this.value; else o.cov.c = this.value; ch(); }; if (g('#pcv')) g('#pcv').onchange = function () { o.cover = this.checked ? 1 : 0; ch(); };
      g('#pal').onchange = function () { o.all = this.checked ? 1 : 0; ch(); }; g('#pd').onclick = function () { remove(o.id); };
    }

    /* ---------- images & signature ---------- */
    async function addImage(blob, isSig) {
      var bm = await createImageBitmap(blob), id = 'i' + uid(), type = blob.type === 'image/jpeg' ? 'jpg' : 'png', bytes;
      if (blob.type === 'image/png' || blob.type === 'image/jpeg') bytes = await blob.arrayBuffer(); else { var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); var b2 = await new Promise(function (r) { c.toBlob(r, 'image/png'); }); bytes = await b2.arrayBuffer(); blob = b2; type = 'png'; }
      S.imgs[id] = { bytes: bytes, type: type, url: URL.createObjectURL(blob) }; var pw = S.pw[S.cur - 1], ph = S.ph[S.cur - 1], w = Math.min(isSig ? 160 : 220, bm.width, pw * .8), h = w * bm.height / bm.width;
      var o = { id: uid(), t: 'img', page: S.cur, all: 0, x: (pw - w) / 2, y: (ph - h) / 2, w: w, h: h, ar: bm.height / bm.width, src: id, cover: 0 }; S.objs.push(o); commit(); S.sel = o.id; drawObjs(); props(); setMode('edit');
    }
    $('#fi').onchange = function () { if (this.files[0]) addImage(this.files[0]); this.value = ''; };
    function sigModal() {
      var m = div('pe-modal'), cur = 'draw'; m.innerHTML = '<div class="pe-mb"><div class="pe-tabs"><button data-k="draw" class="on">' + T('Draw', 'আঁকুন') + '</button><button data-k="type">' + T('Type', 'টাইপ') + '</button><button data-k="up">' + T('Upload', 'আপলোড') + '</button></div><div id="sg"></div><div class="pe-mf"><button id="sc">' + T('Cancel', 'বাতিল') + '</button><button id="su" class="pe-dl">' + T('Use signature', 'সিগনেচার ব্যবহার') + '</button></div></div>'; root.appendChild(m);
      var box = m.querySelector('#sg'), cvs, ctx, file, txt;
      function draw() {
        cur = 'draw'; box.innerHTML = '<canvas id="sk" width="520" height="190"></canvas><div><label>' + T('Ink', 'কালি') + ' <input id="sci" type="color" value="#1a237e"></label> <button id="scl">' + T('Clear', 'মুছুন') + '</button></div>'; cvs = box.querySelector('#sk'); ctx = cvs.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round'; var on = 0;
        cvs.onpointerdown = function (e) { on = 1; cvs.setPointerCapture(e.pointerId); var r = cvs.getBoundingClientRect(); ctx.strokeStyle = box.querySelector('#sci').value; ctx.beginPath(); ctx.moveTo((e.clientX - r.left) * 520 / r.width, (e.clientY - r.top) * 190 / r.height); };
        cvs.onpointermove = function (e) { if (!on) return; var r = cvs.getBoundingClientRect(); ctx.lineTo((e.clientX - r.left) * 520 / r.width, (e.clientY - r.top) * 190 / r.height); ctx.stroke(); }; cvs.onpointerup = function () { on = 0; }; box.querySelector('#scl').onclick = function () { ctx.clearRect(0, 0, 520, 190); };
      }
      function type() { cur = 'type'; box.innerHTML = '<input id="st" class="pt-in" placeholder="' + T('Type your name', 'আপনার নাম লিখুন') + '"><canvas id="sk" width="520" height="190"></canvas>'; txt = box.querySelector('#st'); cvs = box.querySelector('#sk'); ctx = cvs.getContext('2d'); txt.oninput = function () { ctx.clearRect(0, 0, 520, 190); ctx.fillStyle = '#1a237e'; ctx.font = 'italic 70px "Segoe Script","Snell Roundhand","Brush Script MT","Lucida Handwriting",cursive'; ctx.textBaseline = 'middle'; ctx.fillText(txt.value, 20, 95, 480); }; }
      function up() { cur = 'up'; box.innerHTML = '<input id="sf" type="file" accept="image/*" class="pt-in">'; box.querySelector('#sf').onchange = function () { file = this.files[0]; }; }
      draw(); [].forEach.call(m.querySelectorAll('.pe-tabs button'), function (b) { b.onclick = function () { [].forEach.call(m.querySelectorAll('.pe-tabs button'), function (x) { x.classList.remove('on'); }); b.classList.add('on'); ({ draw: draw, type: type, up: up })[b.dataset.k](); }; });
      m.querySelector('#sc').onclick = function () { m.remove(); };
      m.querySelector('#su').onclick = async function () {
        var blob; if (cur === 'up') blob = file; else { var d = ctx.getImageData(0, 0, 520, 190), x0 = 520, y0 = 190, x1 = 0, y1 = 0; for (var y = 0; y < 190; y++) for (var x = 0; x < 520; x++) if (d.data[(y * 520 + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 <= x0) { m.remove(); return; } var c = document.createElement('canvas'); c.width = x1 - x0 + 8; c.height = y1 - y0 + 8; c.getContext('2d').drawImage(cvs, x0 - 4, y0 - 4, c.width, c.height, 0, 0, c.width, c.height); blob = await new Promise(function (r) { c.toBlob(r, 'image/png'); }); }
        m.remove(); if (blob) addImage(blob, 1);
      };
    }

    /* ---------- watermark ---------- */
    function strip(s, wm) {
      var re = /\/(\w+)\s*(<<[\s\S]*?>>|\/[\w.+\-]+)\s*BDC|\/\w+\s*BMC|\bEMC\b/g, m, st = [], cut = [];
      while ((m = re.exec(s))) { if (m[0] === 'EMC') { var b = st.pop(); if (b && b.w) cut.push([b.i, m.index + 3]); } else { var w = false; if (m[1]) { if (m[1] === 'Artifact' && /\/Subtype\s*\/Watermark/.test(m[2])) w = true; else if (m[1] === 'OC' && m[2].charAt(0) === '/' && wm[m[2].slice(1)]) w = true; } st.push({ i: m.index, w: w }); } }
      cut.sort(function (a, b) { return a[0] - b[0]; }); var out = '', pos = 0, n = 0; cut.forEach(function (c) { if (c[0] < pos) return; out += s.slice(pos, c[0]); pos = c[1]; n++; }); return { s: out + s.slice(pos), n: n };
    }
    function stripWM(P, doc) {
      var ctx = doc.context, N = P.PDFName, blocks = 0, annots = 0;
      doc.getPages().forEach(function (pg) {
        var node = pg.node;
        try { var an = node.lookupMaybe(N.of('Annots'), P.PDFArray); if (an) { var keep = [], c0 = an.size(); for (var i = 0; i < c0; i++) { var r = an.get(i), a = ctx.lookup(r), st = a && a.lookupMaybe ? a.lookupMaybe(N.of('Subtype'), N) : null; if (st && st.toString() === '/Watermark') annots++; else keep.push(r); } if (keep.length !== c0) node.set(N.of('Annots'), ctx.obj(keep)); } } catch (e) { }
        var wm = {}; try { var rs = node.Resources(), pr = rs && rs.lookupMaybe(N.of('Properties'), P.PDFDict); if (pr) pr.entries().forEach(function (en) { try { var d = ctx.lookup(en[1]), nm = d && d.lookupMaybe ? d.lookupMaybe(N.of('Name'), P.PDFString, P.PDFHexString) : null; if (nm && /water\s*mark/i.test(nm.decodeText())) wm[en[0].decodeText()] = 1; } catch (e) { } }); } catch (e) { }
        try {
          var co = node.Contents(); if (!co) return; var arr = []; if (co instanceof P.PDFArray) { for (var k = 0; k < co.size(); k++) arr.push(co.lookup(k)); } else arr.push(co);
          var parts = arr.map(function (sm) { return sm.getUnencodedContents ? sm.getUnencodedContents() : P.decodePDFRawStream(sm).decode(); }), s = parts.map(function (b) { var t = ''; for (var i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return t; }).join('\n'), r2 = strip(s, wm);
          if (r2.n) { var u = new Uint8Array(r2.s.length); for (var j = 0; j < u.length; j++) u[j] = r2.s.charCodeAt(j); node.set(N.of('Contents'), ctx.register(ctx.flateStream(u))); blocks += r2.n; }
        } catch (e) { }
      }); return { blocks: blocks, annots: annots };
    }
    $('#wms').onclick = async function () {
      $('#wmm').textContent = T('Scanning...', 'খোঁজা হচ্ছে...'); try { await load('pdflib'); var d = await PDFLib.PDFDocument.load(S.bytes.slice(0)), r = stripWM(PDFLib, d), t = r.blocks + r.annots;
        $('#wmc').checked = !!t; $('#wmm').textContent = t ? T('Found ' + t + ' removable watermark item(s). It will be removed on download.', t + 'টা সরানো যায় এমন ওয়াটারমার্ক পাওয়া গেছে। ডাউনলোডের সময় সরে যাবে।') : T('No removable watermark found. If it is baked into the page, use Cover / Erase with "Every page".', 'সরানো যায় এমন ওয়াটারমার্ক নেই। পেজের সাথে মিশে থাকলে "সব পেজে" টিক দিয়ে ঢাকুন / মুছুন ব্যবহার করুন।'); } catch (e) { $('#wmm').textContent = T('Scan failed.', 'খোঁজা ব্যর্থ।'); }
    };

    /* ---------- toolbar ---------- */
    $('#un').onclick = function () { undo(-1); }; $('#re').onclick = function () { undo(1); };
    $('#zm').onclick = function () { S.z = Math.max(.5, S.z - .15); show(S.cur); }; $('#zp').onclick = function () { S.z = Math.min(3, S.z + .15); show(S.cur); };
    $('#pv').onclick = function () { if (S.cur > 1) show(S.cur - 1); }; $('#nx').onclick = function () { if (S.cur < S.n) show(S.cur + 1); };

    /* ---------- export ---------- */
    function wrap(font, size, line, maxW) { var words = line.split(' '), out = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (cur && font.widthOfTextAtSize(t, size) > maxW) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); return out; }
    function safe(font, t) { return t.replace(/[\s\S]/gu, function (ch) { try { font.widthOfTextAtSize(ch, 10); return ch; } catch (e) { return ch === '\t' ? '  ' : '?'; } }); }
    $('#dlb').onclick = async function () {
      say(T('Building your PDF...', 'PDF তৈরি হচ্ছে...')); var bad = 0;
      try {
        await load('pdflib'); var P = PDFLib, doc = await P.PDFDocument.load(S.bytes.slice(0)); if ($('#wmc').checked) stripWM(P, doc);
        if (S.fontBytes && S.objs.some(function (o) { return o.font === 'custom'; })) { await load('fontkit'); doc.registerFontkit(window.fontkit); }
        var fc = {}, ic = {}; async function font(o) { var key = o.font === 'custom' && S.fontBytes ? 'custom' : (o.font === 'custom' ? 'helv' : o.font) + (o.b ? 'b' : '') + (o.i ? 'i' : ''); if (fc[key]) return fc[key]; if (key === 'custom') fc[key] = await doc.embedFont(S.fontBytes, { subset: true }); else { var fam = STD[o.font === 'custom' ? 'helv' : o.font]; fc[key] = await doc.embedFont(P.StandardFonts[fam[(o.b ? 1 : 0) + (o.i ? 2 : 0)]]); } return fc[key]; }
        var pages = doc.getPages();
        for (var i = 0; i < pages.length; i++) {
          var pg = pages[i], ph = S.ph[i] || pg.getSize().height, pw = S.pw[i] || pg.getSize().width;
          for (var k = 0; k < S.objs.length; k++) {
            var o = S.objs[k]; if (!(o.all || o.page === i + 1)) continue; var sx = o.all ? pw / S.pw[o.page - 1] : 1, sy = o.all ? ph / S.ph[o.page - 1] : 1, x = o.x * sx, y = o.y * sy, w = (o.w || 0) * sx, h = (o.h || 0) * sy, col;
            if (o.t === 'cover') { col = hex2rgb(o.c); pg.drawRectangle({ x: x, y: ph - y - h, width: w, height: h, color: P.rgb(col[0], col[1], col[2]) }); }
            else if (o.t === 'img') { if (o.cover) pg.drawRectangle({ x: x, y: ph - y - h, width: w, height: h, color: P.rgb(1, 1, 1) }); var im = ic[o.src] || (ic[o.src] = S.imgs[o.src].type === 'jpg' ? await doc.embedJpg(S.imgs[o.src].bytes) : await doc.embedPng(S.imgs[o.src].bytes)); pg.drawImage(im, { x: x, y: ph - y - h, width: w, height: h }); }
            else if (o.t === 'text') {
              if (o.cov) { col = hex2rgb(o.cov.c); pg.drawRectangle({ x: o.cov.x * sx, y: ph - (o.cov.y * sy + o.cov.h * sy), width: o.cov.w * sx, height: o.cov.h * sy, color: P.rgb(col[0], col[1], col[2]) }); }
              if (!o.txt) continue; var f = await font(o), size = o.size * sx, tc = hex2rgb(o.color), lines = []; o.txt.split('\n').forEach(function (ln) { var s2 = f.name && /^(Helvetica|Times|Courier)/.test(f.name) ? safe(f, ln) : ln; if (s2 !== ln) bad = 1; if (o.nowrap) lines.push(s2); else wrap(f, size, s2, w).forEach(function (l) { lines.push(l); }); });
              lines.forEach(function (l, n) { if (l) pg.drawText(l, { x: x, y: ph - (y + .95 * size + n * 1.2 * size), size: size, font: f, color: P.rgb(tc[0], tc[1], tc[2]) }); });
            }
          }
        }
        var out = await doc.save(); dl(new Blob([out], { type: 'application/pdf' }), S.name + '-edited.pdf'); say(bad ? T('Done. Some characters (like Bangla) are not in the standard fonts and became "?". Choose "Custom font..." and upload a .ttf font to keep them.', 'হয়ে গেছে। কিছু অক্ষর (যেমন বাংলা) স্ট্যান্ডার্ড ফন্টে নেই, তাই "?" হয়েছে। রাখতে "নিজের ফন্ট..." বেছে .ttf ফন্ট দিন।') : T('Downloaded.', 'ডাউনলোড হয়েছে।'), bad);
      } catch (e) { say(e.message === 'lib' ? T('Could not load a library. Check your internet connection.', 'লাইব্রেরি লোড হয়নি। ইন্টারনেট দেখুন।') : T('Could not build the PDF: ', 'PDF বানানো যায়নি: ') + (e.message || ''), 1); }
    };
    props();
  }
  window.PSBMPdfEditor = { mount: mount };
  document.addEventListener('DOMContentLoaded', function () { var r = document.getElementById('pe'); if (r) mount(r); });
})();
