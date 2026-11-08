/**
 * PSBM Labs — Google Sheet -> JSON API (Apps Script Web App)
 * Tabs: "Packages", "Apps", "Projects" (row 1 = column names, see SHEET-SETUP.md)
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */
var TABS = { packages: 'Packages', apps: 'Apps', projects: 'Projects' };
var CACHE_KEY = 'psbm_data_v2';

function doGet(e) {
  var cache = CacheService.getScriptCache();
  var body = cache.get(CACHE_KEY);
  if (!body) {
    var out = { updated: new Date().toISOString() };
    Object.keys(TABS).forEach(function (k) { out[k] = readTab_(TABS[k]); });
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

function onEdit() { CacheService.getScriptCache().remove(CACHE_KEY); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('PSBM Site')
    .addItem('Create / fill Projects tab (first time)', 'setupSampleData')
    .addToUi();
}

// Run once: creates the "Projects" tab with your current 7 case studies (only if the tab is empty)
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
  "summary": "Flutter text utility app with AES-256 encryption and an unobtrusive free tier.",
  "role": "Full build, ongoing development",
  "tech": "Flutter, Hive, AES-256",
  "problem": "Everyday text tasks — case conversion, quick encryption, format cleanup — were scattered across multiple single-purpose apps, most of them ad-heavy in ways that interrupted the actual task.",
  "solution": "Text Studio bundles common text utilities into one Flutter app with local Hive storage for saved snippets and AES-256 encryption for anything sensitive, paired with a reusable ads module engineered so the free tier stays fast and unobtrusive rather than interruption-driven.",
  "features": "Case conversion, formatting, and text-cleanup tools in one place\nAES-256 local encryption for sensitive notes and snippets\nOffline-first storage using Hive, so nothing depends on a network connection\nReusable, non-intrusive ads module designed around free-tier retention",
  "result": "The app is live with a smooth free-tier experience and continues to receive ongoing feature development ahead of its next production release milestone.",
  "order": "7",
  "visible": "yes"
 }
];
