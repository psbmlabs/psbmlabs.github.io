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

  var IC = { bold: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z', italic: 'M19 4h-9M14 20H5M15 4 9 20', under: 'M6 3v7a6 6 0 0 0 12 0V3M4 21h16', strike: 'M16 5H9.5a3.5 3.5 0 0 0-1 6.9M4 12h16M14.5 12.1A3.5 3.5 0 0 1 14 19H7', al: 'M21 6H3M15 12H3M17 18H3', ac: 'M21 6H3M17 12H7M19 18H5', ar: 'M21 6H3M21 12H9M21 18H7', vt: 'M4 4h16M12 8v12M8 12l4-4 4 4', vm: 'M4 12h16M12 3v6M9 6l3 3 3-3M12 21v-6M9 18l3-3 3 3', vb: 'M4 20h16M12 4v12M8 12l4 4 4-4', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', copy: 'M8 8h12v12H8zM4 16V4h12', fwd: 'M12 19V5M6 11l6-6 6 6', bwd: 'M12 5v14M6 13l6 6 6-6', edit: 'M4 6V4h16v2M12 4v16M9 20h6', addt: 'M3 5h10M8 5v12M17 13v6M14 16h6', img: 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7M16 5h6M19 2v6M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21', sig: 'M3 17c3-6 5-10 7-10s-3 12 0 12 3-6 5-6 2 3 6 3', wm: 'M12 2.7 5.6 9.1a9 9 0 1 0 12.8 0z', cover: 'M3 6h18v12H3zM8 6v12', undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3', dl: 'M12 3v12M7 10l5 5 5-5M4 21h16', open: 'M4 20h16M12 4v12M7 9l5-5 5 5' };
  var ic = function (k, s) { return '<svg width="' + (s || 17) + '" height="' + (s || 17) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; };
  function mount(root) {
    var S = { objs: [], imgs: {}, hist: [], hi: -1, cur: 1, z: 1.3, mode: 'edit', sel: null, texts: {}, els: {}, wm: 0, tok: 0, dpr: window.devicePixelRatio || 1, fonts: [], more: 0, newId: null, snap: null, uid: 1, pw: [], ph: [] };
    root.innerHTML = '<div class="pe-empty"><div class="pe-drop" tabindex="0" role="button"><div class="pt-ic">\u270E</div><div>' + T('Drop a PDF here or click to choose', 'একটা PDF এখানে ছাড়ুন বা ক্লিক করে বেছে নিন') + '</div><small>' + T('Your file stays on your device. Nothing is uploaded.', 'আপনার ফাইল আপনার ডিভাইসেই থাকে। কিছুই আপলোড হয় না।') + '</small></div></div>' +
      '<div class="pe-app" hidden><div class="pe-bar"><div class="pe-tools">' + '<button class="pe-tl" data-m="edit">' + ic('edit', 18) + '<span>' + T('Edit text', 'লেখা এডিট') + '</span></button>' + '<button class="pe-tl" data-m="text">' + ic('addt', 18) + '<span>' + T('Add text', 'লেখা যোগ') + '</span></button>' + '<button class="pe-tl" data-m="img">' + ic('img', 18) + '<span>' + T('Add image', 'ছবি যোগ') + '</span></button>' + '<button class="pe-tl" data-m="sig">' + ic('sig', 18) + '<span>' + T('Signature', 'সিগনেচার') + '</span></button>' + '<button class="pe-tl" data-m="wm">' + ic('wm', 18) + '<span>' + T('Add watermark', 'ওয়াটারমার্ক') + '</span></button>' + '<button class="pe-tl" data-m="cover">' + ic('cover', 18) + '<span>' + T('Cover / Erase', 'ঢাকুন / মুছুন') + '</span></button>' + '</div><span class="sp"></span><button class="pe-ib" id="un" title="Undo">' + ic('undo') + '</button><button class="pe-ib" id="re" title="Redo">' + ic('redo') + '</button><button class="pe-ib" id="zm">\u2212</button><span id="zl"></span><button class="pe-ib" id="zp">+</button><button class="pe-ib" id="pv">\u25C0</button><span id="pl"></span><button class="pe-ib" id="nx">\u25B6</button><button id="op">' + ic('open', 15) + ' ' + T('Open other', 'অন্য ফাইল') + '</button><button class="pe-dl" id="dlb">' + ic('dl', 15) + ' ' + T('Download PDF', 'PDF ডাউনলোড') + '</button></div>' +
      '<div class="pe-props" id="pp"></div><div class="pe-wm"><b>' + T('Watermark', 'ওয়াটারমার্ক') + ':</b> <button id="wms">' + T('Detect watermark', 'ওয়াটারমার্ক খুঁজুন') + '</button> <label><input type="checkbox" id="wmc"> ' + T('Remove tagged watermark', 'ট্যাগ করা ওয়াটারমার্ক সরান') + '</label> <input id="wmt" class="pe-c" placeholder="' + T('or type the watermark text', 'অথবা ওয়াটারমার্কের লেখা টাইপ করুন') + '"> <span id="wmm"></span><div id="wml" class="pe-wml"></div></div>' +
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
    function add(o) { S.objs.push(o); S.newId = o.id; S.snap = null; S.sel = o.id; commit(); drawObjs(); props(); }
    function fam(o) { return FAM[o.font] || ('"psbm-' + o.font + '",sans-serif'); }
    function css(o) { return 'font-size:' + (o.size * S.z) + 'px;font-family:' + fam(o) + ';font-weight:' + (o.b ? 700 : 400) + ';font-style:' + (o.i ? 'italic' : 'normal') + ';color:' + o.color + ';line-height:' + (o.ls || 1.2) + ';text-align:' + ({ l: 'left', c: 'center', r: 'right' }[o.al || 'l']) + ';text-decoration:' + (((o.u ? 'underline ' : '') + (o.s ? 'line-through' : '')).trim() || 'none') + (o.hl ? ';background:' + o.hl : ''); }
    function place(o) {
      var e = S.els[o.id]; if (!e) return; var z = S.z, r = e.root; r.style.left = o.x * z + 'px'; r.style.top = o.y * z + 'px'; r.style.opacity = o.op == null ? 1 : o.op; r.style.transformOrigin = '0 0'; r.style.transform = o.rot ? 'rotate(' + o.rot + 'deg)' : 'none';
      if (o.t !== 'text') { r.style.width = o.w * z + 'px'; r.style.height = o.h * z + 'px'; } else { r.style.width = o.w * z + 'px'; r.style.height = o.h ? o.h * z + 'px' : 'auto'; }
    }
    function drawObjs() {
      ly.innerHTML = ''; S.els = {}; var z = S.z;
      S.objs.forEach(function (o) {
        if (!vis(o)) return; var r = div('pe-o t-' + o.t + (S.sel === o.id ? ' sel' : '')), e = { root: r };
        if (o.t === 'text' && o.cov) { var cvr = div('pe-cv'); cvr.style.cssText = 'left:' + o.cov.x * z + 'px;top:' + o.cov.y * z + 'px;width:' + o.cov.w * z + 'px;height:' + o.cov.h * z + 'px;background:' + o.cov.c; ly.appendChild(cvr); e.cv = cvr; }
        if (o.t === 'text') { r.style.display = 'flex'; r.style.flexDirection = 'column'; r.style.justifyContent = { t: 'flex-start', m: 'center', b: 'flex-end' }[o.va || 't']; var tx = div('pe-tx'); tx.contentEditable = 'true'; tx.spellcheck = false; tx.textContent = o.txt; tx.style.cssText = css(o) + ';white-space:' + (o.nowrap ? 'pre' : 'pre-wrap'); tx.oninput = function () { o.txt = tx.innerText.replace(/\n$/, ''); if (o.nowrap && (o.al || 'l') === 'l' && tx.scrollWidth / z > o.w) { o.w = tx.scrollWidth / z + 1; place(o); } }; tx.onfocus = function () { sel(o.id, 1); }; tx.onblur = function () { commit(); }; r.appendChild(tx); e.tx = tx; }
        else if (o.t === 'img') { var im = document.createElement('img'); im.src = S.imgs[o.src].url; im.draggable = false; r.appendChild(im); if (o.cover) r.style.background = '#fff'; }
        else { r.style.background = o.c; }
        if (o.t !== 'text') r.onpointerdown = function (e2) { sel(o.id); startDrag(e2, o, 'move'); };
        var mv = div('pe-mv'); mv.title = 'Move'; mv.onpointerdown = function (e2) { sel(o.id, 1); startDrag(e2, o, 'move'); }; r.appendChild(mv);
        var rz = div('pe-rz'); rz.onpointerdown = function (e2) { sel(o.id, 1); startDrag(e2, o, 'size'); }; r.appendChild(rz);
        ly.appendChild(r); S.els[o.id] = e; place(o);
      });
    }
    function sel(id) { if (S.sel === id) return; S.sel = id; S.snap = id === S.newId ? null : JSON.stringify(byId(id)); if (id !== S.newId) S.newId = null; [].forEach.call(ly.querySelectorAll('.pe-o'), function (x) { x.classList.remove('sel'); }); var e = S.els[id]; if (e) e.root.classList.add('sel'); props(); }
    function startDrag(e, o, kind) {
      e.preventDefault(); e.stopPropagation(); var sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y, ow = o.w, oh = o.h, z = S.z, th = (o.rot || 0) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), eh = S.els[o.id] ? S.els[o.id].root.offsetHeight / z : 20;
      function mv(ev) { var dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z; if (kind === 'move') { o.x = ox + dx; o.y = oy + dy; } else { var rx = dx * c + dy * s, ry = -dx * s + dy * c, nw = Math.max(8, ow + rx); if (o.t === 'img') { o.w = nw; o.h = nw * o.ar; } else if (o.t === 'cover') { o.w = nw; o.h = Math.max(4, oh + ry); } else { o.w = nw; o.h = Math.max(o.size * (o.ls || 1.2), (oh || eh) + ry); } } place(o); }
      function up() { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); commit(); }
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    }
    function remove(id) { S.objs = S.objs.filter(function (o) { return o.id !== id; }); S.sel = null; S.newId = null; commit(); drawObjs(); props(); }

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
      add(o); focusTx(o.id);
    }
    function focusTx(id) { setTimeout(function () { var e = S.els[id]; if (e && e.tx) { e.tx.focus(); var r = document.createRange(); r.selectNodeContents(e.tx); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } }, 40); }

    /* ---------- modes & page clicks ---------- */
    function setMode(m) { S.mode = m; pgEl.className = 'pe-page m-' + m; [].forEach.call(root.querySelectorAll('.pe-bar [data-m]'), function (b) { b.classList.toggle('on', b.dataset.m === m); }); }
    [].forEach.call(root.querySelectorAll('.pe-bar [data-m]'), function (b) { b.onclick = function () { var m = b.dataset.m; if (m === 'img') $('#fi').click(); else if (m === 'sig') sigModal(); else if (m === 'wm') wmModal(); else setMode(m); }; });
    pgEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pe-o,.pe-ti')) return; var r = pgEl.getBoundingClientRect(), x = (e.clientX - r.left) / S.z, y = (e.clientY - r.top) / S.z;
      if (S.mode === 'text') { var o = { id: uid(), t: 'text', page: S.cur, all: 0, x: x, y: y - 8, w: 200, size: 14, font: 'helv', b: 0, i: 0, color: '#000000', txt: '', nowrap: 0 }; add(o); setMode('edit'); focusTx(o.id); }
      else if (S.mode === 'cover') {
        e.preventDefault(); var o2 = { id: uid(), t: 'cover', page: S.cur, all: 0, x: x, y: y, w: 1, h: 1, c: '#ffffff' }; S.objs.push(o2); S.sel = o2.id; drawObjs();
        var mv = function (ev) { o2.w = Math.max(1, (ev.clientX - r.left) / S.z - x); o2.h = Math.max(1, (ev.clientY - r.top) / S.z - y); place(o2); };
        var up = function () { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (o2.w < 4 || o2.h < 4) { S.objs.pop(); S.sel = null; drawObjs(); return; } var s = sample({ x: o2.x - 4, base: o2.y + o2.h * .85 + 0, size: o2.h / 1.12, w: o2.w + 8 }); o2.c = s.bg; S.newId = o2.id; S.snap = null; commit(); drawObjs(); props(); setMode('edit'); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up);
      } else if (S.sel) { S.sel = null; drawObjs(); props(); }
    });
    addEventListener('keydown', function (e) { if (!root.isConnected || $('.pe-app').hidden) return; var ed = document.activeElement && document.activeElement.isContentEditable; if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel && !ed && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); remove(S.sel); } if ((e.ctrlKey || e.metaKey) && !ed && /^[zy]$/i.test(e.key)) { e.preventDefault(); undo(e.key.toLowerCase() === 'z' && !e.shiftKey ? -1 : 1); } });

    /* ---------- properties bar ---------- */
    function props() {
      var p = $('#pp'), o = S.sel && byId(S.sel); if (!o) { p.innerHTML = '<span class="pt-sm">' + T('Click any text on the page to edit it, or pick a tool above.', 'পেজের যেকোনো লেখায় ক্লিক করে এডিট করুন, অথবা উপরের টুল বেছে নিন।') + '</span>'; return; }
      var op = Math.round((o.op == null ? 1 : o.op) * 100), tg = function (k, ico, t) { return '<button class="pe-ib' + (o[k] ? ' on' : '') + '" data-tg="' + k + '" title="' + t + '">' + ic(ico) + '</button>'; };
      var sg = function (k, arr, def) { return '<span class="pe-seg">' + arr.map(function (a) { return '<button class="pe-ib' + ((o[k] || def) === a[0] ? ' on' : '') + '" data-sg="' + k + '" data-v="' + a[0] + '" title="' + a[2] + '">' + ic(a[1]) + '</button>'; }).join('') + '</span>'; };
      var h = '';
      if (o.t === 'text') {
        var fopts = [['helv', 'Helvetica'], ['times', 'Times'], ['cour', 'Courier']].concat(S.fonts.map(function (f) { return [f.id, f.name]; })).map(function (f) { return '<option value="' + f[0] + '"' + (o.font === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('');
        h += '<select id="pf" class="pe-c">' + fopts + '<option value="__up">\uFF0B ' + T('Upload font...', 'ফন্ট আপলোড...') + '</option></select><input id="ps" class="pe-c pe-sz" list="pszl" value="' + o.size + '" title="' + T('Size', 'সাইজ') + '"><datalist id="pszl">' + [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96].map(function (n) { return '<option value="' + n + '">'; }).join('') + '</datalist>';
        h += '<span class="pe-c pe-col">' + T('Color', 'রঙ') + ' <input id="pc" type="color" value="' + o.color + '"><span class="pe-sw">' + ['#000000', '#ffffff', '#6b7280', '#dc2626', '#2563eb', '#16a34a', '#ea580c', '#7c3aed'].map(function (c) { return '<i data-sw="' + c + '" style="background:' + c + '"></i>'; }).join('') + '</span></span>';
      }
      if (o.t === 'cover') h += '<label class="pe-c">' + T('Fill', 'ভরাট') + ' <input id="pbg" type="color" value="' + o.c + '"></label>';
      if (o.cov && o.t === 'text') h += '<label class="pe-c">' + T('Background', 'ব্যাকগ্রাউন্ড') + ' <input id="pbg" type="color" value="' + o.cov.c + '"></label>';
      h += '<label class="pe-c">' + T('Opacity', 'অপাসিটি') + ' <input id="pop" type="number" min="5" max="100" step="5" value="' + op + '">%</label><input id="por" class="pe-rng" type="range" min="5" max="100" step="5" value="' + op + '">';
      if (o.t === 'text') h += '<span class="pe-sep"></span>' + tg('b', 'bold', 'Bold') + tg('i', 'italic', 'Italic') + tg('u', 'under', 'Underline') + tg('s', 'strike', 'Strikethrough') + '<span class="pe-sep"></span>' + sg('al', [['l', 'al', 'Left'], ['c', 'ac', 'Center'], ['r', 'ar', 'Right']], 'l') + sg('va', [['t', 'vt', 'Top'], ['m', 'vm', 'Middle'], ['b', 'vb', 'Bottom']], 't');
      h += '<span class="sp"></span><button class="pe-ib" id="pmore" title="More">' + (S.more ? '\u25B4' : '\u25BE') + ' ' + T('More', 'আরও') + '</button><button class="pe-ib pe-del" id="pd" title="' + T('Delete', 'মুছুন') + '">' + ic('trash') + '</button><button id="pcan">' + T('Cancel', 'বাতিল') + '</button><button id="psav" class="pe-dl">' + T('Save', 'সেভ') + '</button>';
      if (S.more) {
        h += '<div class="pe-more">';
        if (o.t === 'text') h += '<label class="pe-c">' + T('Line spacing', 'লাইন ব্যবধান') + ' <select id="pls">' + [1, 1.15, 1.2, 1.5, 2, 2.5].map(function (n) { return '<option' + ((o.ls || 1.2) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label class="pe-c"><input id="phl" type="checkbox"' + (o.hl ? ' checked' : '') + '> ' + T('Highlight', 'হাইলাইট') + ' <input id="phc" type="color" value="' + (o.hl || '#fff176') + '"></label>';
        if (o.t === 'img') h += '<button class="pe-c" id="pwb">' + T('Remove white background', 'সাদা ব্যাকগ্রাউন্ড সরান') + '</button><label class="pe-c"><input id="pcv" type="checkbox"' + (o.cover ? ' checked' : '') + '> ' + T('White behind (hides old image)', 'পেছনে সাদা (পুরনো ছবি ঢাকে)') + '</label>';
        h += '<label class="pe-c"><input id="pwm" type="checkbox"' + (o.wm ? ' checked' : '') + '> ' + T('Mark as watermark (removable later)', 'ওয়াটারমার্ক হিসেবে চিহ্নিত (পরে সরানো যাবে)') + '</label><label class="pe-c">' + T('Rotate', 'ঘোরান') + ' <input id="prr" class="pe-rng" type="range" min="-180" max="180" step="1" value="' + (o.rot || 0) + '"><input id="prn" type="number" min="-180" max="180" value="' + (o.rot || 0) + '">\u00B0</label><label class="pe-c"><input id="pal" type="checkbox"' + (o.all ? ' checked' : '') + '> ' + T('Every page', 'সব পেজে') + '</label><button class="pe-c" id="pdu">' + ic('copy', 15) + ' ' + T('Duplicate', 'ডুপ্লিকেট') + '</button><button class="pe-c" id="pfw">' + ic('fwd', 15) + ' ' + T('Front', 'সামনে') + '</button><button class="pe-c" id="pbk">' + ic('bwd', 15) + ' ' + T('Back', 'পেছনে') + '</button></div>';
      } else h += '<label class="pe-c pe-ev"><input id="pal" type="checkbox"' + (o.all ? ' checked' : '') + '> ' + T('Every page', 'সব পেজে') + '</label>';
      p.innerHTML = h;
      var g = function (i) { return p.querySelector(i); }, redraw = function () { drawObjs(); commit(); }, soft = function () { place(o); };
      p.onclick = function (e) {
        var b = e.target.closest('[data-tg],[data-sg],[data-sw]'); if (!b) return;
        if (b.dataset.tg) { o[b.dataset.tg] = o[b.dataset.tg] ? 0 : 1; if (b.dataset.tg === 'b' || b.dataset.tg === 'i') { } redraw(); props(); } else if (b.dataset.sg) { o[b.dataset.sg] = b.dataset.v; redraw(); props(); } else if (b.dataset.sw) { o.color = b.dataset.sw; redraw(); props(); }
      };
      if (g('#pf')) g('#pf').onchange = function () { var v = this.value; if (v === '__up') { this.value = o.font; $('#ff').click(); $('#ff').onchange = async function () { var f = this.files[0]; this.value = ''; if (!f) return; var id = 'c' + (S.fonts.length + 1), nm = f.name.replace(/\.[^.]+$/, ''), bytes = await f.arrayBuffer(); try { var ff = new FontFace('psbm-' + id, bytes.slice(0)); await ff.load(); document.fonts.add(ff); } catch (er) { } S.fonts.push({ id: id, name: nm, bytes: bytes }); o.font = id; redraw(); props(); }; return; } o.font = v; redraw(); };
      if (g('#ps')) g('#ps').onchange = function () { o.size = Math.max(4, Math.min(300, +this.value || o.size)); redraw(); };
      if (g('#pc')) g('#pc').onchange = function () { o.color = this.value; redraw(); };
      if (g('#pbg')) g('#pbg').onchange = function () { if (o.t === 'cover') o.c = this.value; else o.cov.c = this.value; redraw(); };
      var setOp = function (v) { v = Math.max(5, Math.min(100, +v || 100)); o.op = v / 100; g('#pop').value = v; g('#por').value = v; soft(); };
      g('#pop').onchange = function () { setOp(this.value); commit(); }; g('#por').oninput = function () { setOp(this.value); }; g('#por').onchange = function () { commit(); };
      g('#pal').onchange = function () { o.all = this.checked ? 1 : 0; redraw(); };
      g('#pmore').onclick = function () { S.more = !S.more; props(); }; g('#pd').onclick = function () { remove(o.id); }; g('#psav').onclick = function () { S.sel = null; S.newId = null; drawObjs(); props(); say(''); };
      g('#pcan').onclick = function () { if (S.newId === o.id || !S.snap) { remove(o.id); return; } var i = S.objs.indexOf(o); S.objs[i] = JSON.parse(S.snap); S.sel = null; commit(); drawObjs(); props(); };
      if (S.more) {
        if (g('#pls')) g('#pls').onchange = function () { o.ls = +this.value; redraw(); }; if (g('#phl')) { g('#phl').onchange = function () { o.hl = this.checked ? g('#phc').value : ''; redraw(); }; g('#phc').onchange = function () { if (g('#phl').checked) { o.hl = this.value; redraw(); } }; }
        if (g('#pcv')) g('#pcv').onchange = function () { o.cover = this.checked ? 1 : 0; redraw(); };
        if (g('#pwb')) g('#pwb').onclick = async function () { var im = S.imgs[o.src], bm = await createImageBitmap(new Blob([im.bytes])), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; var x = c.getContext('2d'); x.drawImage(bm, 0, 0); var d = x.getImageData(0, 0, c.width, c.height), a = d.data; for (var i = 0; i < a.length; i += 4) { var m = Math.min(a[i], a[i + 1], a[i + 2]); if (m > 235) a[i + 3] = 0; else if (m > 190) a[i + 3] = Math.round(a[i + 3] * (235 - m) / 45); } x.putImageData(d, 0, 0); var b = await new Promise(function (r) { c.toBlob(r, 'image/png'); }), id = 'i' + uid(); S.imgs[id] = { bytes: await b.arrayBuffer(), type: 'png', url: URL.createObjectURL(b) }; o.src = id; redraw(); };
        g('#pwm').onchange = function () { o.wm = this.checked ? 1 : 0; commit(); };
        var setR = function (v) { v = Math.max(-180, Math.min(180, Math.round(+v || 0))); o.rot = v; g('#prr').value = v; g('#prn').value = v; soft(); }; g('#prr').oninput = function () { setR(this.value); }; g('#prr').onchange = commit; g('#prn').onchange = function () { setR(this.value); commit(); };
        g('#pdu').onclick = function () { var c = JSON.parse(JSON.stringify(o)); c.id = uid(); c.x += 14; c.y += 14; delete c.ti; add(c); }; g('#pfw').onclick = function () { S.objs.splice(S.objs.indexOf(o), 1); S.objs.push(o); redraw(); }; g('#pbk').onclick = function () { S.objs.splice(S.objs.indexOf(o), 1); S.objs.unshift(o); redraw(); };
      }
    }

    /* ---------- images & signature ---------- */
    async function addImage(blob, isSig) {
      var bm = await createImageBitmap(blob), id = 'i' + uid(), type = blob.type === 'image/jpeg' ? 'jpg' : 'png', bytes;
      if (blob.type === 'image/png' || blob.type === 'image/jpeg') bytes = await blob.arrayBuffer(); else { var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); var b2 = await new Promise(function (r) { c.toBlob(r, 'image/png'); }); bytes = await b2.arrayBuffer(); blob = b2; type = 'png'; }
      S.imgs[id] = { bytes: bytes, type: type, url: URL.createObjectURL(blob) }; var pw = S.pw[S.cur - 1], ph = S.ph[S.cur - 1], w = Math.min(isSig ? 160 : 220, bm.width, pw * .8), h = w * bm.height / bm.width;
      var o = { id: uid(), t: 'img', page: S.cur, all: 0, x: (pw - w) / 2, y: (ph - h) / 2, w: w, h: h, ar: bm.height / bm.width, src: id, cover: 0 }; add(o); setMode('edit');
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
    var norm = function (t) { return String(t).replace(/\s+/g, ' ').trim().toLowerCase(); };
    function bytesStr(b) { var t = ''; for (var i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return t; }
    function pageStr(P, node) { var co = node.Contents(); if (!co) return null; var arr = []; if (co instanceof P.PDFArray) { for (var k = 0; k < co.size(); k++) arr.push(co.lookup(k)); } else arr.push(co); return arr.map(function (sm) { return bytesStr(sm.getUnencodedContents ? sm.getUnencodedContents() : P.decodePDFRawStream(sm).decode()); }).join('\n'); }
    function putStr(P, doc, node, s) { var u = new Uint8Array(s.length); for (var j = 0; j < u.length; j++) u[j] = s.charCodeAt(j) & 255; node.set(P.PDFName.of('Contents'), doc.context.register(doc.context.flateStream(u))); }
    function strip(s, wm) {
      var re = /\/(\w+)\s*(<<[\s\S]*?>>|\/[\w.+\-]+)\s*BDC|\/\w+\s*BMC|\bEMC\b/g, m, st = [], cut = [];
      while ((m = re.exec(s))) { if (m[0] === 'EMC') { var b = st.pop(); if (b && b.w) cut.push([b.i, m.index + 3]); } else { var w = false; if (m[1]) { if (m[1] === 'Artifact' && /\/Subtype\s*\/Watermark/.test(m[2])) w = true; else if (m[1] === 'OC' && m[2].charAt(0) === '/' && wm[m[2].slice(1)]) w = true; } st.push({ i: m.index, w: w }); } }
      cut.sort(function (a, b) { return a[0] - b[0]; }); var out = '', pos = 0, n = 0; cut.forEach(function (c) { if (c[0] < pos) return; out += s.slice(pos, c[0]); pos = c[1]; n++; }); return { s: out + s.slice(pos), n: n };
    }
    function decodeStr(blk) {
      var out = '', re = /\(((?:\\[\s\S]|[^\\()])*)\)|<([0-9A-Fa-f\s]*)>/g, m;
      while ((m = re.exec(blk))) {
        if (m[1] !== undefined) out += m[1].replace(/\\([nrtbf()\\])|\\([0-7]{1,3})/g, function (_, c, o) { return o ? String.fromCharCode(parseInt(o, 8)) : { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c]; });
        else { var hx = m[2].replace(/\s/g, ''); if (hx.length % 2) hx += '0'; for (var i = 0; i < hx.length; i += 2) { var c = parseInt(hx.substr(i, 2), 16); if (c === 0) return null; out += String.fromCharCode(c); } }
      } return out;
    }
    function blocks(s) {
      var re = /\bBT\b([\s\S]*?)\bET\b/g, m, o = []; while ((m = re.exec(s))) { var tm = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/.exec(m[1]), tf = /\/\S+\s+(-?[\d.]+)\s+Tf/.exec(m[1]); o.push({ i: m.index, e: m.index + m[0].length, t: decodeStr(m[1]), rot: tm ? Math.abs(+tm[2]) > .01 || Math.abs(+tm[3]) > .01 : false, size: tf ? Math.abs(+tf[1]) : 0 }); } return o;
    }
    function stripText(s, texts) { var out = '', pos = 0, n = 0; blocks(s).forEach(function (b) { if (b.t == null) return; var t = norm(b.t); if (t && texts.some(function (x) { return t.indexOf(x) > -1; })) { out += s.slice(pos, b.i); pos = b.e; n++; } }); return { s: out + s.slice(pos), n: n }; }
    function stripWM(P, doc, texts, tags) {
      var ctx = doc.context, N = P.PDFName, nb = 0, na = 0, nt = 0;
      doc.getPages().forEach(function (pg) {
        var node = pg.node, wm = {};
        if (tags) {
          try { var an = node.lookupMaybe(N.of('Annots'), P.PDFArray); if (an) { var keep = [], c0 = an.size(); for (var i = 0; i < c0; i++) { var r = an.get(i), a = ctx.lookup(r), st = a && a.lookupMaybe ? a.lookupMaybe(N.of('Subtype'), N) : null; if (st && st.toString() === '/Watermark') na++; else keep.push(r); } if (keep.length !== c0) node.set(N.of('Annots'), ctx.obj(keep)); } } catch (e) { }
          try { var rs = node.Resources(), pr = rs && rs.lookupMaybe(N.of('Properties'), P.PDFDict); if (pr) pr.entries().forEach(function (en) { try { var d = ctx.lookup(en[1]), nm = d && d.lookupMaybe ? d.lookupMaybe(N.of('Name'), P.PDFString, P.PDFHexString) : null; if (nm && /water\s*mark/i.test(nm.decodeText())) wm[en[0].decodeText()] = 1; } catch (e) { } }); } catch (e) { }
        }
        try { var s = pageStr(P, node); if (s == null) return; var ch = false; if (tags) { var r1 = strip(s, wm); if (r1.n) { s = r1.s; nb += r1.n; ch = true; } } if (texts && texts.length) { var r2 = stripText(s, texts); if (r2.n) { s = r2.s; nt += r2.n; ch = true; } } if (ch) putStr(P, doc, node, s); } catch (e) { }
      }); return { blocks: nb, annots: na, texts: nt };
    }
    function scanText(P, doc) {
      var map = {}, pgs = doc.getPages(); pgs.forEach(function (pg, idx) { try { var s = pageStr(P, pg.node); if (s == null) return; blocks(s).forEach(function (b) { if (b.t == null) return; var k = norm(b.t); if (k.length < 2 || !/[a-z\u0980-\u09ff]/i.test(k)) return; var c = map[k] || (map[k] = { text: b.t.replace(/\s+/g, ' ').trim(), key: k, pages: {}, np: 0, rot: false, size: 0 }); if (!c.pages[idx]) { c.pages[idx] = 1; c.np++; } c.rot = c.rot || b.rot; c.size = Math.max(c.size, b.size); }); } catch (e) { } });
      return Object.keys(map).map(function (k) { return map[k]; }).filter(function (c) { return c.rot || c.size >= 36 || (pgs.length > 1 && c.np >= Math.min(pgs.length, 2) && c.np === pgs.length); }).sort(function (a, b) { return (b.rot - a.rot) || (b.np - a.np); }).slice(0, 12);
    }
    function wmTexts() { var t = [].map.call(root.querySelectorAll('.wtc:checked'), function (x) { return x.value; }); ($('#wmt').value || '').split(',').forEach(function (x) { x = norm(x); if (x) t.push(x); }); return t; }
    $('#wms').onclick = async function () {
      $('#wmm').textContent = T('Scanning...', 'খোঁজা হচ্ছে...'); $('#wml').innerHTML = '';
      try {
        await load('pdflib'); var P = PDFLib, d = await PDFLib.PDFDocument.load(S.bytes.slice(0)), cands = scanText(P, d), r = stripWM(P, d, [], true), t = r.blocks + r.annots; $('#wmc').checked = !!t;
        $('#wml').innerHTML = cands.map(function (c) { return '<label class="pe-c"><input type="checkbox" class="wtc" value="' + esc(c.key) + '"' + (c.rot || c.size >= 36 ? ' checked' : '') + '> \u201C' + esc(c.text.slice(0, 40)) + '\u201D \u00B7 ' + c.np + ' ' + T('page(s)', 'পেজ') + (c.rot ? ' \u00B7 ' + T('rotated', 'কোণাকুণি') : '') + '</label>'; }).join('');
        $('#wmm').textContent = (t ? T('Found ' + t + ' tagged watermark item(s). ', t + 'টা ট্যাগ করা ওয়াটারমার্ক পাওয়া গেছে। ') : '') + (cands.length ? T('Tick the text watermarks to remove, then download.', 'যেসব লেখার ওয়াটারমার্ক সরাতে চান টিক দিয়ে ডাউনলোড করুন।') : (t ? '' : T('No watermark text found automatically. Type the watermark text below, or cover it with Cover / Erase + "Every page".', 'নিজে থেকে কিছু পাওয়া যায়নি। নিচের বক্সে ওয়াটারমার্কের লেখা টাইপ করুন, অথবা Cover / Erase + "সব পেজে" দিয়ে ঢাকুন।')));
      } catch (e) { $('#wmm').textContent = T('Scan failed.', 'খোঁজা ব্যর্থ।'); }
    };

    /* ---------- toolbar ---------- */
    $('#un').onclick = function () { undo(-1); }; $('#re').onclick = function () { undo(1); };
    $('#zm').onclick = function () { S.z = Math.max(.5, S.z - .15); show(S.cur); }; $('#zp').onclick = function () { S.z = Math.min(3, S.z + .15); show(S.cur); };
    $('#pv').onclick = function () { if (S.cur > 1) show(S.cur - 1); }; $('#nx').onclick = function () { if (S.cur < S.n) show(S.cur + 1); };

    /* ---------- watermark text ---------- */
    function wmModal() {
      var m = div('pe-modal'); m.innerHTML = '<div class="pe-mb"><h4 style="margin:0 0 10px">' + T('Add watermark', 'ওয়াটারমার্ক যোগ করুন') + '</h4><input id="wt" class="pt-in" placeholder="DRAFT, CONFIDENTIAL, ' + T('your name', 'আপনার নাম') + '"><div class="pe-wf"><label class="pe-c">' + T('Size', 'সাইজ') + ' <input id="wsz" type="number" value="64" min="8" max="300"></label><label class="pe-c">' + T('Color', 'রঙ') + ' <input id="wco" type="color" value="#808080"></label><label class="pe-c">' + T('Opacity', 'অপাসিটি') + ' <input id="wop" type="number" value="30" min="5" max="100">%</label><label class="pe-c">' + T('Angle', 'কোণ') + ' <input id="wan" type="number" value="-45" min="-180" max="180">\u00B0</label></div><p class="pt-sm">' + T('Added to every page. You can still move, resize or restyle it afterwards. For an image watermark, use Add image, lower its opacity and tick Every page.', 'সব পেজে বসবে। পরে সরানো, ছোট-বড় বা স্টাইল বদলানো যাবে। ছবির ওয়াটারমার্কের জন্য Add image দিয়ে অপাসিটি কমান ও "সব পেজে" টিক দিন।') + '</p><div class="pe-mf"><button id="wc">' + T('Cancel', 'বাতিল') + '</button><button id="wo" class="pe-dl">' + T('Add', 'যোগ করুন') + '</button></div></div>'; root.appendChild(m);
      m.querySelector('#wc').onclick = function () { m.remove(); };
      m.querySelector('#wo').onclick = function () {
        var t = m.querySelector('#wt').value.trim(); if (!t) return; var size = +m.querySelector('#wsz').value || 64, th = (+m.querySelector('#wan').value || 0) * Math.PI / 180, c = document.createElement('canvas').getContext('2d'); c.font = 'bold ' + size + 'px Helvetica,Arial,sans-serif'; var w = c.measureText(t).width + 4, hh = size * 1.2, pw = S.pw[S.cur - 1], ph = S.ph[S.cur - 1], cx = Math.cos(th), sx2 = Math.sin(th);
        m.remove(); add({ id: uid(), t: 'text', page: S.cur, all: 1, x: pw / 2 - (w / 2 * cx - hh / 2 * sx2), y: ph / 2 - (w / 2 * sx2 + hh / 2 * cx), w: w, size: size, font: 'helv', b: 1, i: 0, color: m.querySelector('#wco').value, op: Math.max(5, Math.min(100, +m.querySelector('#wop').value || 30)) / 100, rot: Math.round(+m.querySelector('#wan').value || 0), al: 'c', txt: t, nowrap: 1, wm: 1 });
      };
    }

    /* ---------- export ---------- */
    function wrap(font, size, line, maxW) { var words = line.split(' '), out = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (cur && font.widthOfTextAtSize(t, size) > maxW) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); return out; }
    function safe(font, t) { return t.replace(/[\s\S]/gu, function (ch) { try { font.widthOfTextAtSize(ch, 10); return ch; } catch (e) { return ch === '\t' ? '  ' : '?'; } }); }
    $('#dlb').onclick = async function () {
      say(T('Building your PDF...', 'PDF তৈরি হচ্ছে...')); var bad = 0;
      try {
        await load('pdflib'); var P = PDFLib, doc = await P.PDFDocument.load(S.bytes.slice(0)); var wt = wmTexts(); if ($('#wmc').checked || wt.length) stripWM(P, doc, wt, $('#wmc').checked);
        if (S.objs.some(function (o) { return S.fonts.some(function (f) { return f.id === o.font; }); })) { await load('fontkit'); doc.registerFontkit(window.fontkit); }
        var fc = {}, ic2 = {}; async function font(o) { var cf = S.fonts.filter(function (f) { return f.id === o.font; })[0], key = cf ? cf.id : o.font + (o.b ? 'b' : '') + (o.i ? 'i' : ''); if (fc[key]) return fc[key]; if (cf) fc[key] = await doc.embedFont(cf.bytes, { subset: true }); else { var fm = STD[o.font] || STD.helv; fc[key] = await doc.embedFont(P.StandardFonts[fm[(o.b ? 1 : 0) + (o.i ? 2 : 0)]]); } return fc[key]; }
        var pages = doc.getPages();
        for (var i = 0; i < pages.length; i++) {
          var pg = pages[i], ph = S.ph[i] || pg.getSize().height, pw = S.pw[i] || pg.getSize().width;
          for (var k = 0; k < S.objs.length; k++) {
            var o = S.objs[k]; if (!(o.all || o.page === i + 1)) continue; var sx = o.all ? pw / S.pw[o.page - 1] : 1, sy = o.all ? ph / S.ph[o.page - 1] : 1, x = o.x * sx, y = o.y * sy, w = (o.w || 0) * sx, h = (o.h || 0) * sy, col;
            var tag = o.wm ? [P.PDFOperator.of(P.PDFOperatorNames.BeginMarkedContentSequence, [P.PDFName.of('Artifact'), doc.context.obj({ Type: P.PDFName.of('Pagination'), Subtype: P.PDFName.of('Watermark') })]), P.PDFOperator.of(P.PDFOperatorNames.EndMarkedContent)] : null, op = o.op == null ? 1 : o.op, al = -(o.rot || 0) * Math.PI / 180, ca = Math.cos(al), sa = Math.sin(al), deg = P.degrees(-(o.rot || 0)), Tx = x, Ty = ph - y, pt = function (dx, dy) { return [Tx + dx * ca + dy * sa, Ty + dx * sa - dy * ca]; };
            if (tag) pg.pushOperators(tag[0]);
            if (o.t === 'cover') { col = hex2rgb(o.c); var b0 = pt(0, h); pg.drawRectangle({ x: b0[0], y: b0[1], width: w, height: h, color: P.rgb(col[0], col[1], col[2]), opacity: op, rotate: deg }); }
            else if (o.t === 'img') { var b1 = pt(0, h); if (o.cover) pg.drawRectangle({ x: b1[0], y: b1[1], width: w, height: h, color: P.rgb(1, 1, 1), opacity: op, rotate: deg }); var im = ic2[o.src] || (ic2[o.src] = S.imgs[o.src].type === 'jpg' ? await doc.embedJpg(S.imgs[o.src].bytes) : await doc.embedPng(S.imgs[o.src].bytes)); pg.drawImage(im, { x: b1[0], y: b1[1], width: w, height: h, opacity: op, rotate: deg }); }
            else if (o.t === 'text') {
              if (o.cov) { col = hex2rgb(o.cov.c); pg.drawRectangle({ x: o.cov.x * sx, y: ph - (o.cov.y * sy + o.cov.h * sy), width: o.cov.w * sx, height: o.cov.h * sy, color: P.rgb(col[0], col[1], col[2]) }); }
              if (!o.txt) { if (tag) pg.pushOperators(tag[1]); continue; } var f = await font(o), size = o.size * sx, L = o.ls || 1.2, tc = hex2rgb(o.color), lines = [], cf2 = P.rgb(tc[0], tc[1], tc[2]), std = !S.fonts.some(function (q) { return q.id === o.font; });
              o.txt.split('\n').forEach(function (ln) { var s2 = std ? safe(f, ln) : ln; if (s2 !== ln) bad = 1; if (o.nowrap) lines.push(s2); else wrap(f, size, s2, w).forEach(function (l) { lines.push(l); }); });
              var th = lines.length * L * size, vo = h && o.va === 'm' ? Math.max(0, (h - th) / 2) : h && o.va === 'b' ? Math.max(0, h - th) : 0;
              lines.forEach(function (l, n) {
                if (!l) return; var lw = f.widthOfTextAtSize(l, size), dx = o.al === 'c' ? Math.max(0, (w - lw) / 2) : o.al === 'r' ? Math.max(0, w - lw) : 0, dy = vo + size * (L / 2 + .35) + n * L * size, ps = pt(dx, dy);
                if (o.hl) { var hc = hex2rgb(o.hl), bl = pt(dx - 1, dy + size * .28); pg.drawRectangle({ x: bl[0], y: bl[1], width: lw + 2, height: size * 1.15, color: P.rgb(hc[0], hc[1], hc[2]), opacity: op, rotate: deg }); }
                pg.drawText(l, { x: ps[0], y: ps[1], size: size, font: f, color: cf2, opacity: op, rotate: deg });
                [[o.u, .13], [o.s, -.3]].forEach(function (ln2) { if (!ln2[0]) return; var a1 = pt(dx, dy + size * ln2[1]), a2 = pt(dx + lw, dy + size * ln2[1]); pg.drawLine({ start: { x: a1[0], y: a1[1] }, end: { x: a2[0], y: a2[1] }, thickness: Math.max(.5, size * .06), color: cf2, opacity: op }); });
              });
            }
            if (tag && !(o.t === 'text' && !o.txt)) pg.pushOperators(tag[1]);
          }
        }
        var out = await doc.save(); dl(new Blob([out], { type: 'application/pdf' }), S.name + '-edited.pdf'); say(bad ? T('Done. Some characters (like Bangla) are not in the standard fonts and became "?". Choose a font with "Upload font..." (.ttf) to keep them.', 'হয়ে গেছে। কিছু অক্ষর (যেমন বাংলা) স্ট্যান্ডার্ড ফন্টে নেই, তাই "?" হয়েছে। রাখতে "ফন্ট আপলোড..." দিয়ে .ttf ফন্ট বেছে নিন।') : T('Downloaded.', 'ডাউনলোড হয়েছে।'), bad);
      } catch (e) { say(e.message === 'lib' ? T('Could not load a library. Check your internet connection.', 'লাইব্রেরি লোড হয়নি। ইন্টারনেট দেখুন।') : T('Could not build the PDF: ', 'PDF বানানো যায়নি: ') + (e.message || ''), 1); }
    };
    props();
  }
  window.PSBMPdfEditor = { mount: mount };
  document.addEventListener('DOMContentLoaded', function () { var r = document.getElementById('pe'); if (r) mount(r); });
})();
