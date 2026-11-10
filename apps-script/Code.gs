/**
 * PSBM Labs — Google Sheet -> JSON API (Apps Script Web App)
 * Tabs: "Packages", "Apps", "Projects" (row 1 = column names, see SHEET-SETUP.md)
 * Plus "Reviews" (created automatically): visitor reviews / comments / suggestions for each app (see SHEET-SETUP.md)
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */
var TABS = { packages: 'Packages', apps: 'Apps', projects: 'Projects' };
var CACHE_KEY = 'psbm_data_v2';

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'reviews') return reviewsList_(e); // paginated reviews for one app
  var cache = CacheService.getScriptCache();
  var body = cache.get(CACHE_KEY);
  if (!body) {
    var out = { updated: new Date().toISOString() };
    Object.keys(TABS).forEach(function (k) { out[k] = readTab_(TABS[k]); });
    try { out.reviewCounts = reviewCounts_(); } catch (err) { out.reviewCounts = {}; } // { slug: [count, avgRating] } - no emails, no text
    body = JSON.stringify(out);
    try { cache.put(CACHE_KEY, body, 60); } catch (err) {} // 60s cache keeps the site fast
  }
  var cb = e && e.parameter && e.parameter.callback; // optional JSONP fallback
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function readTab_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  var v = sh.getDataRange().getDisplayValues();
  if (v.length < 2) return [];
  var head = v[0].map(function (h) { return String(h).trim().toLowerCase(); });
  return v.slice(1)
    .filter(function (r) { return r.join('').trim(); })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) { if (h) o[h] = String(r[i]).trim(); });
      return o;
    });
}

function onEdit() { var c = CacheService.getScriptCache(); c.remove(CACHE_KEY); c.put('rv_ver', String(Date.now()), 21600); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('PSBM Site')
    .addItem('Create / fill Projects tab (first time)', 'setupSampleData')
    .addItem('Create Reviews tab (first time)', 'setupReviews')
    .addToUi();
}

// Run once: creates the "Projects" tab with your current case studies (only if the tab is empty)
function setupSampleData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Projects') || ss.insertSheet('Projects');
  if (sh.getLastRow() > 1) { SpreadsheetApp.getUi().alert('Projects tab already has data - nothing changed.'); return; }
  sh.clear();
  var rows = [HEAD_].concat(SEED_.map(function (o) { return HEAD_.map(function (h) { return o[h] || ''; }); }));
  sh.getRange(1, 1, rows.length, HEAD_.length).setValues(rows);
  sh.setFrozenRows(1);
  CacheService.getScriptCache().remove(CACHE_KEY);
  SpreadsheetApp.getUi().alert('Done. Projects tab created with ' + SEED_.length + ' projects.');
}

/* =====================================================================
 * REVIEWS / COMMENTS / SUGGESTIONS  (Apps page -> "Review / Comment" button)
 * Tab "Reviews" columns: id | created | app | parent | type | name | email | rating | message | visible | reply | reply_by
 *  - visitors post from the site (doPost). Emails are stored here but NEVER sent back to the browser.
 *  - YOU reply by typing in the "reply" column of that row (shown with a "PSBM Labs" badge).
 *  - hide any row: visible = no   (or "pending" if AUTO_APPROVE is false, then change it to yes to publish)
 * ===================================================================== */
var REVIEWS_TAB = 'Reviews';
var RV_HEAD = ['id', 'created', 'app', 'parent', 'type', 'name', 'email', 'rating', 'message', 'visible', 'reply', 'reply_by'];
var RV_PER_PAGE = 30;          // threads per page (the site "Load more" button asks for the next page)
var RV_AUTO_APPROVE = true;    // false = new posts wait as "pending" until you set visible = yes
var RV_MAX_MSG = 1000, RV_MAX_NAME = 60, RV_MAX_EMAIL = 120;
var RV_RATE_PER_HOUR = 5;      // posts per email per hour
var RV_NOTIFY_EMAIL = '';      // optional: put your email here to get a mail for every new post ('' = off)
var RV_RESERVED_NAME = /psbm/i; // visitors cannot sign as the studio

function setupReviews() {
  reviewsSheet_(true);
  SpreadsheetApp.getUi().alert('Reviews tab is ready.');
}

function reviewsSheet_(create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(REVIEWS_TAB);
  if (!sh && create) {
    sh = ss.insertSheet(REVIEWS_TAB);
    sh.getRange(1, 1, 1, RV_HEAD.length).setValues([RV_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 2000, RV_HEAD.length).setNumberFormat('@'); // plain text: nothing typed by a visitor can run as a formula
    sh.setColumnWidth(9, 380); sh.setColumnWidth(11, 380); sh.setColumnWidth(7, 180);
  }
  return sh;
}

function rvIsHidden_(v) { return /^(no|false|0|hide|pending)$/i.test(String(v || '').trim()); }

function readReviews_() {
  var sh = reviewsSheet_(false);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getDisplayValues();
  var head = v[0].map(function (h) { return String(h).trim().toLowerCase(); });
  return v.slice(1).filter(function (r) { return r.join('').trim(); }).map(function (r) {
    var o = {}; head.forEach(function (h, i) { if (h) o[h] = String(r[i]).trim(); }); return o;
  });
}

function rvTop_(r) { return !r.parent && r.type !== 'reply' && !rvIsHidden_(r.visible); }

function reviewCounts_() {
  var out = {}, sum = {}, rated = {};
  readReviews_().filter(rvTop_).forEach(function (r) {
    if (!r.app) return;
    out[r.app] = out[r.app] || [0, 0]; out[r.app][0]++;
    var n = parseInt(r.rating, 10);
    if (r.type === 'review' && n >= 1 && n <= 5) { sum[r.app] = (sum[r.app] || 0) + n; rated[r.app] = (rated[r.app] || 0) + 1; }
  });
  Object.keys(out).forEach(function (k) { out[k][1] = rated[k] ? Math.round(sum[k] / rated[k] * 10) / 10 : 0; });
  return out;
}

function rvPublic_(r, replies) {
  var o = { id: r.id, created: r.created, type: r.type, name: r.name, message: r.message };
  if (r.type === 'review' && r.rating) o.rating = parseInt(r.rating, 10) || 0;
  if (r.reply) { o.reply = r.reply; o.reply_by = r.reply_by || 'PSBM Labs'; }
  o.replies = (replies || []).map(function (x) { return { id: x.id, created: x.created, name: x.name, message: x.message }; });
  return o; // email is intentionally not included
}

function jsonOut_(obj, cb) {
  var body = JSON.stringify(obj);
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function reviewsList_(e) {
  var p = e.parameter || {}, app = String(p.app || '').trim().slice(0, 80), page = Math.max(1, parseInt(p.page, 10) || 1), cb = p.callback;
  var cache = CacheService.getScriptCache(), key = 'rv_' + (cache.get('rv_ver') || '0') + '_' + app + '_' + page, body = cache.get(key);
  if (!body) {
    var rows = readReviews_(), tops = [], reps = {};
    rows.forEach(function (r) {
      if (r.app !== app || rvIsHidden_(r.visible)) return;
      if (r.type === 'reply' && r.parent) { (reps[r.parent] = reps[r.parent] || []).push(r); }
      else if (!r.parent) tops.push(r);
    });
    tops.sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
    var sum = 0, rated = 0;
    tops.forEach(function (r) { var n = parseInt(r.rating, 10); if (r.type === 'review' && n >= 1 && n <= 5) { sum += n; rated++; } });
    var total = tops.length, pages = Math.max(1, Math.ceil(total / RV_PER_PAGE));
    var items = tops.slice((page - 1) * RV_PER_PAGE, page * RV_PER_PAGE).map(function (r) {
      var rs = (reps[r.id] || []).sort(function (a, b) { return String(a.created).localeCompare(String(b.created)); });
      return rvPublic_(r, rs);
    });
    body = JSON.stringify({ ok: true, app: app, page: page, per: RV_PER_PAGE, total: total, pages: pages, rated: rated, avg: rated ? Math.round(sum / rated * 10) / 10 : 0, items: items });
    try { cache.put(key, body, 120); } catch (err) {}
  }
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function bad_(m) { var e = new Error(m); e.user = true; throw e; }
function clean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max); }

function doPost(e) {
  var res;
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    res = submitReview_(d);
  } catch (err) {
    if (!err.user) { try { console.error(err); } catch (x) {} }
    res = { ok: false, error: err.user ? err.message : 'Something went wrong. Please try again in a moment.' };
  }
  return jsonOut_(res);
}

function submitReview_(d) {
  if (d.website) return { ok: true, hidden: true };                       // honeypot: bots fill this hidden field
  var type = String(d.type || '').toLowerCase();
  if (['review', 'comment', 'suggestion', 'reply'].indexOf(type) < 0) bad_('Please choose what you want to send.');
  var app = clean_(d.app, 80);
  var apps = readTab_('Apps').filter(function (a) { return a.slug === app && !/^(no|false|0|hide)$/i.test(a.visible || '') && (a.status || '').toLowerCase() !== 'coming'; });
  if (!apps.length) bad_('This app was not found.');
  var name = clean_(d.name, RV_MAX_NAME), email = clean_(d.email, RV_MAX_EMAIL).toLowerCase(), msg = clean_(d.message, RV_MAX_MSG);
  if (name.length < 2) bad_('Please enter your name.');
  if (RV_RESERVED_NAME.test(name)) bad_('Please use your own name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad_('Please enter a valid email address.');
  if (msg.length < 3) bad_('Please write a few words.');
  var rating = '';
  if (type === 'review') { var n = parseInt(d.rating, 10); if (!(n >= 1 && n <= 5)) bad_('Please give a star rating.'); rating = String(n); }
  var parent = '';
  if (type === 'reply') {
    parent = clean_(d.parent, 40);
    var par = readReviews_().filter(function (r) { return r.id === parent && r.app === app && !r.parent && !rvIsHidden_(r.visible); });
    if (!par.length) bad_('The comment you are replying to was not found.');
  }
  var cache = CacheService.getScriptCache();
  var rk = 'rl_' + email, used = parseInt(cache.get(rk) || '0', 10);
  if (used >= RV_RATE_PER_HOUR) bad_('You are posting too fast. Please try again a bit later.');
  var dk = 'dup_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email + '|' + app + '|' + msg));
  if (cache.get(dk)) bad_('You already sent this message.');

  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  var row, sh;
  try {
    sh = reviewsSheet_(true);
    var id = 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    row = [id, new Date().toISOString(), app, parent, type, name, email, rating, msg, RV_AUTO_APPROVE ? 'yes' : 'pending', '', ''];
    var rg = sh.getRange(sh.getLastRow() + 1, 1, 1, RV_HEAD.length);
    rg.setNumberFormat('@'); rg.setValues([row]);
  } finally { lock.releaseLock(); }
  cache.put(rk, String(used + 1), 3600); cache.put(dk, '1', 600);
  cache.put('rv_ver', String(Date.now()), 21600); cache.remove(CACHE_KEY);
  if (RV_NOTIFY_EMAIL) { try { MailApp.sendEmail(RV_NOTIFY_EMAIL, 'New ' + type + ' on ' + apps[0].name, name + ' <' + email + '>\n\n' + msg); } catch (err) {} }
  var rec = { id: row[0], created: row[1], type: type, name: name, message: msg, rating: rating };
  return { ok: true, pending: !RV_AUTO_APPROVE, item: type === 'reply' ? { id: rec.id, created: rec.created, name: name, message: msg } : rvPublic_(rec, []) };
}

var HEAD_ = ["slug", "title", "title_bn", "category", "category_bn", "type", "status", "letters", "color", "summary", "summary_bn", "role", "role_bn", "tech", "problem", "problem_bn", "solution", "solution_bn", "features", "features_bn", "result", "result_bn", "image", "case_url", "live_url", "play_url", "repo", "order", "visible"];
var SEED_ = [
 {
  "slug": "barisal-health-connect",
  "title": "Barisal Health Connect",
  "category": "Healthcare · Web platform",
  "type": "Web platform",
  "status": "development",
  "letters": "BH",
  "color": "#5b5bf0",
  "summary": "Online appointment booking and patient records for small clinics, with automatic SMS confirmations.",
  "role": "Architecture & ongoing build",
  "tech": "Laravel, MySQL, Bootstrap",
  "problem": "Small clinics were booking appointments over phone calls and a physical appointment book, which led to double-bookings, no-shows with no reminder system, and patient records scattered across paper files with no easy way to pull up history during a visit.",
  "solution": "Barisal Health Connect gives small clinics a web-based booking and patient-record system: patients book a slot online or the front desk books on their behalf, an SMS confirmation goes out automatically, and doctors can pull up a patient's visit history in seconds instead of digging through paper files.",
  "features": "Online appointment booking with automatic SMS confirmation\nFront-desk queue view showing today's bookings in order\nSearchable patient records with visit history\nRole-based access separating front-desk, doctor, and admin views",
  "result": "The platform is in active development with a small healthcare provider as the first rollout partner; the architecture is built to extend to multiple clinic locations from a single admin account once the first deployment is validated.",
  "order": "1",
  "visible": "yes"
 },
 {
  "slug": "eduportal",
  "title": "EduPortal",
  "category": "Education · Web platform",
  "type": "Web platform",
  "status": "live",
  "letters": "EC",
  "color": "#b45309",
  "summary": "Role-based school platform for attendance, results and parent notifications.",
  "role": "Full build & staff training",
  "tech": "Laravel, jQuery, MySQL",
  "problem": "A local educational institution was managing attendance and results on paper and in disconnected spreadsheets, which made term-end reporting slow and gave parents no visibility into their child's attendance or performance between report cards.",
  "solution": "EduPortal is a role-based web platform where teachers mark attendance and enter results directly, admins get institution-wide reporting, and parents receive automatic notifications — replacing a paper-and-spreadsheet process with a single system of record.",
  "features": "Daily attendance marking with automatic absence notifications to parents\nResult entry and term-report generation for teachers and admins\nRole-based portal separating teacher, admin, and parent-facing views\nStaff training and onboarding included as part of the rollout",
  "result": "The institution now generates term reports in a fraction of the previous time, and parents get real-time attendance notifications instead of finding out about absences at the next report card. The platform is live and in daily use by staff.",
  "order": "2",
  "visible": "yes"
 },
 {
  "slug": "freighttrack-bd",
  "title": "FreightTrack BD",
  "category": "Logistics · Web dashboard",
  "type": "Web dashboard",
  "status": "live",
  "letters": "FB",
  "color": "#4338ca",
  "summary": "Live fleet and shipment tracking dashboard with automatic delay flagging.",
  "role": "Dashboard build & API integration",
  "tech": "Python, Django, PostgreSQL",
  "problem": "A regional logistics operator had no central way to see where its fleet was or which shipments were running late — dispatchers relied on phone calls to drivers, and delays were often discovered only after a customer complained.",
  "solution": "FreightTrack BD is a Django dashboard that pulls in location and status data from the fleet and surfaces it as a live operations view: dispatchers can see every active shipment's route history, get flagged automatically when a delivery is running behind schedule, and pull delay reports by route or driver.",
  "features": "Live fleet map with per-vehicle route history\nAutomatic delay flagging based on expected vs. actual arrival\nDriver-level and route-level delay reporting for operations review\nPostgreSQL backend built to handle historical trip data at scale",
  "result": "Dispatchers now catch delays as they happen rather than after a customer calls in, and the delay reporting has given the operator concrete data to identify which routes or time slots consistently run behind. The dashboard is live and in daily operational use.",
  "order": "3",
  "visible": "yes"
 },
 {
  "slug": "krishi-bazar",
  "title": "Krishi Bazar",
  "category": "Agriculture · Mobile",
  "type": "Mobile",
  "status": "live",
  "letters": "KB",
  "color": "#be185d",
  "summary": "Flutter marketplace connecting farmers directly with buyers, with price alerts and in-app messaging.",
  "role": "Product design, build & API",
  "tech": "Flutter, Node.js, MongoDB",
  "problem": "Farmers selling produce locally were dependent on middlemen for price discovery and buyer access, which compressed their margins and left them with little visibility into fair market prices in nearby markets.",
  "solution": "Krishi Bazar is a Flutter marketplace app that lets farmers list produce directly, see live price trends for their crop type, and message interested buyers directly — cutting out layers of intermediation while keeping the transaction itself simple enough for low-literacy users.",
  "features": "Simple photo-and-price listing flow built for low-bandwidth connections\nPrice alerts so farmers know when local market rates shift\nIn-app messaging between farmer and buyer with order status tracking\nNode.js/MongoDB backend built to handle seasonal traffic spikes at harvest time",
  "result": "The app is live and connects farmers directly with local buyers, giving sellers real-time price visibility they didn't have before and cutting the number of steps between listing a crop and closing a sale.",
  "order": "4",
  "visible": "yes"
 },
 {
  "slug": "notun-khata",
  "title": "Notun Khata",
  "category": "Finance · Mobile",
  "type": "Mobile",
  "status": "live",
  "letters": "NK",
  "color": "#0f766e",
  "summary": "Bangla digital ledger for shop owners with automatic SMS reminders on overdue dues.",
  "role": "Full build & Play Store launch",
  "tech": "Kotlin, SQLite, Jetpack",
  "problem": "Shop owners extending credit to regular customers ('বাকি') were tracking dues in a physical notebook — easy to lose, easy to dispute, and impossible to search when a customer's balance needed checking on the spot.",
  "solution": "Notun Khata replaces the paper khata with a Bangla-first Android app: shop owners record credit against a customer's name in seconds, and the app automatically sends an SMS reminder when a balance goes overdue, without the owner having to type anything extra.",
  "features": "Bangla-language interface built for shop owners, not developers\nPer-customer running balance with full transaction history\nAutomatic SMS reminders on overdue dues, configurable by shop owner\nWorks fully offline using local SQLite storage — no data plan required",
  "result": "Shop owners now have a searchable, dispute-proof record of every customer's balance, and the automatic SMS reminders have measurably sped up collection on overdue accounts. The app shipped to the Play Store and is in daily use.",
  "order": "5",
  "visible": "yes"
 },
 {
  "slug": "setu-pos",
  "title": "Setu POS",
  "category": "Retail · Mobile + Web",
  "type": "Mobile + Web",
  "status": "live",
  "letters": "SP",
  "color": "#0369a1",
  "summary": "Offline-first point-of-sale and inventory app for small retail shops, syncing to Firebase.",
  "role": "Full build, in-store rollout & support",
  "tech": "Kotlin, Firebase, Room DB",
  "problem": "Small retail shop owners in and around Barisal were tracking sales and stock by hand in paper registers, which made end-of-day reconciliation slow and error-prone, and gave owners no visibility into stock levels until items had already run out.",
  "solution": "We built Setu POS as an Android-first point-of-sale app that works fully offline using a local Room database, then syncs to a central Firebase backend the moment connectivity returns — so a shop with an unreliable internet connection never loses a sale.",
  "features": "Offline-first billing with barcode/manual entry and instant receipt printing\nAutomatic stock deduction on each sale, with low-stock alerts\nOwner dashboard showing daily sales, top items, and stock value across locations\nRole-based logins so staff can bill without seeing profit margins",
  "result": "Shop owners now close out each day in minutes instead of manually tallying a paper ledger, and stock-outs on fast-moving items dropped noticeably once low-stock alerts were in place. The app is live and in active use across multiple retail locations.",
  "order": "6",
  "visible": "yes"
 },
 {
  "slug": "text-studio",
  "title": "Text Studio",
  "category": "Productivity · Mobile",
  "type": "Mobile",
  "status": "live",
  "letters": "TS",
  "color": "#7c3aed",
  "summary": "A Flutter toolbox of 15 text tools — six free and fully offline, nine unlocked with a short ad — built on a reusable ads module that keeps the free tier calm.",
  "role": "Full build, ongoing development",
  "tech": "Flutter, Hive, AES-256, Google AdMob, go_router, Provider",
  "problem": "Small text jobs come up all day: counting words before a submission, fixing the case of a pasted paragraph, stripping duplicate lines, making a QR code, translating a sentence, locking a note. Each one usually sends people to a different single-purpose app, and the free ones tend to put an ad in the middle of the task. We wanted one app where simple jobs need no connection, and where ads pay for the app without making people leave.",
  "solution": "Text Studio puts every tool one tap from a single home screen. Six core tools are free, work offline and open instantly with no ad gate. The other nine open after a short ad, and the app tells people up front which is which — a video icon on the tile, and a clear greyed-out state when there is no internet. A reusable ads module handles consent, ad formats and reloads, so the app itself stays simple.",
  "features": "15 text tools in one app, from Case Converter and Word Counter to Diff Checker, Text to QR/Bar and Text Translate\nSix core tools are free, offline and open instantly; nine are unlocked with a short ad\nAES-256 text encryption that runs on the device\nHive-based local storage, so saved data never depends on a network\nFeatured carousel and a colour-coded 3-column tool grid with light and dark themes\nTools that need internet grey out with a clear “No internet” label instead of failing after a tap\nReusable ads module: UMP/GDPR consent, rewarded, rewarded-interstitial and interstitial formats, ad flags from a hosted JSON\nBack button asks before closing the app on Android",
  "result": "Text Studio is live with fifteen tools and keeps growing: a new tool is one model entry plus one route, and it inherits the offline and ad behaviour automatically. The ads module built here now also powers the PRO tiles in DailyShield, so the work was reused instead of rebuilt.",
  "case_url": "projects/text-studio.html",
  "order": "7",
  "visible": "yes"
 },
 {
  "slug": "dailyshield",
  "title": "DailyShield",
  "category": "Safety & Daily Routine · Mobile",
  "type": "Mobile",
  "status": "development",
  "letters": "DS",
  "color": "#1b3d6d",
  "summary": "A Flutter app that gathers daily protection habits into one place: ten tools, five of which count toward a Shield Score that resets every midnight.",
  "role": "Product design & full build",
  "tech": "Flutter, Hive, Google ML Kit, Google AdMob, go_router, Provider",
  "problem": "Looking after yourself and your things is a lot of small, repeating jobs: save the receipt before it fades, change the password that is due, write down what you need to remember, drink water, take the medicine, pray on time, keep the phone quiet where it matters, and know who to call when something goes wrong. People spread these over many apps, and nothing tells them at the end of the day whether they actually covered the basics.",
  "solution": "DailyShield brings these jobs into one app built around a single idea, the Shield Score. Five daily tasks — scan a receipt, review passwords, write a note, reach your water goal, pray — fill a ring pinned to the top of the home screen, and it resets every midnight. Five more tools sit beside them without affecting the score: Auto Silent, Permission Audit, Medicine Reminder, Emergency Contacts and Shield Guard.",
  "features": "Shield Score: an animated ring that fills as the five daily tasks are completed, resetting every midnight\nScore card pinned above the scrolling module grid, with one small icon per daily task\nTap-through bottom sheet that explains how to earn the score in plain language\nReceipt Scanner: photo crop and compress, on-device text recognition, saved to local storage\nPassword Expiry Tracker, Daily Notebook, Water, Medicine and Prayer reminders\nEmergency Contacts hub with emergency numbers for 190+ countries bundled in the app\nShield Guard: link scan, secure vault, fake call and intruder alert\nFree PRO tools opened by a rewarded ad, with an adaptive banner kept clear of tappable content",
  "result": "The core loop is in place: ten modules, a score that stays accurate when modules are switched on or off, offline-capable tools, and an ad setup designed around Play Store policy. DailyShield is in active development, with new modules added through the same module model without touching the home screen layout.",
  "case_url": "projects/dailyshield.html",
  "order": "8",
  "visible": "yes"
 }
];
