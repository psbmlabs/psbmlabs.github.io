# Manage Packages & Apps from Google Sheets (Apps Script only — no CSV)

## One-time setup
1. Create a Google Sheet with three tabs named exactly **Packages**, **Apps** and **Projects**.
   Row 1 = column names (see below), one package/app per row.
2. In the sheet: **Extensions > Apps Script**. Delete the sample code, paste everything from `apps-script/Code.gs`, click Save.
3. **Deploy > New deployment > Select type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click Deploy, authorize when asked, and copy the **Web app URL** (ends with `/exec`).
4. Open that URL in a browser — you should see JSON with your packages and apps.
5. Paste the URL into `data/site-config.json` as `"appsScript"` and commit once.

## Daily use
Edit the sheet only. Changes show on the site within ~1 minute. No code, no re-deploy.
If you change `Code.gs` later: Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy (the URL stays the same).

## Columns
**Packages:** slug, name, status (stable | beta | planned), version, updated, platform, license, repo, pubdev, page (optional), order, visible (yes/no), tagline, summary, features (one per line: `Title | Description`), install, usage, details (one paragraph per line), changelog (one per line: `v0.1.0 | 2026-12-01 | note`).
**Apps:** slug, name, category, status (live | beta | coming), letters, color (#hex), description, tags (comma separated), play_url, apk_url, case_url, order, visible. (`slug` is required for the Review / Comment button.)
**Bangla:** add `_bn` columns (`tagline_bn`, `summary_bn`, `features_bn`, `details_bn`, `name_bn`, `category_bn`, `description_bn`). Used when a visitor selects Bangla; empty = English.

**Projects:** slug, title, category, type (e.g. Mobile / Web), status (live | development), letters, color, summary, role, tech (comma separated), problem, solution, features (one per line), result, image (URL), case_url, live_url, play_url, repo, order, visible. Bangla: `title_bn`, `summary_bn`, `problem_bn` ...
Tip: in the sheet menu **PSBM Site > Create / fill Projects tab** creates the Projects tab with your 7 current case studies (run once).

**packages.html, apps.html, projects.html (+ package.html, project.html) contain no data — everything comes from the sheet.**

## Reviews, comments & suggestions (Apps page)
Every app card (except "coming soon") has a **Review / Comment** button. Visitors choose Review (with stars), Comment or Suggestion, enter **name + email + message**, and can reply under any post. The list loads **30 conversations at a time** with a "Load more" button.

**One-time setup after updating `Code.gs`:**
1. Paste the new `apps-script/Code.gs` into Apps Script and save.
2. Sheet menu **PSBM Site > Create Reviews tab (first time)** (the tab is also created automatically on the first post).
3. **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy.** Without this step the site cannot post reviews. The URL does not change.

**Reviews tab columns:** `id | created | app | parent | type | name | email | rating | message | visible | reply | reply_by`
- `app` = the app's `slug` from the Apps tab. `type` = review / comment / suggestion / reply. `parent` = id of the post a reply belongs to.
- **Reply as PSBM Labs:** type your answer in the **reply** column of that row. It shows under the post with a "PSBM Labs" badge. (`reply_by` is optional; empty = "PSBM Labs".)
- **Hide a post:** set `visible` = `no`.
- **Emails stay private.** They are stored only in this sheet and are never sent to the website.
- Visitors cannot sign with a name containing "psbm", so the badge cannot be faked.

**Settings** (top of the Reviews section in `Code.gs`): `RV_PER_PAGE` (30), `RV_AUTO_APPROVE` (true = posts go live at once; false = they wait as `pending` until you set `visible` = `yes`), `RV_RATE_PER_HOUR` (5 posts per email per hour), `RV_NOTIFY_EMAIL` (put your email to get a mail for every new post; the first run asks you to authorise sending mail).
Spam protection: hidden honeypot field, rate limit, duplicate check, text-only cells (nothing typed by a visitor can run as a formula).

## Case studies
Static case-study pages live in `projects/<slug>.html` (hand-made, kept by the nightly build). The listing and the `project.html?p=<slug>` page come from the **Projects** tab. To use the new pages, set `case_url` to `projects/<slug>.html` in both the **Projects** tab and the **Apps** tab (this is what shows the "Case study" button on the app card). Ready-to-import rows for Text Studio and DailyShield: `sheet-rows/Projects_text-studio_and_dailyshield.csv`.

## Notes
- New package = new row. Without a `page` value it opens `package.html?p=<slug>` automatically.
- `visible = no` hides a row.
- If the script is unreachable the site shows its last saved copy, then the built-in content.
- The web app is public: never put passwords or API keys in the sheet.
- Bangla for other pages: `python3 tools/extract_strings.py` -> add pairs to `data/i18n/bn.json`.

## Troubleshooting (site still shows old data / "Loading…")
0. Test the endpoint: open `YOUR_EXEC_URL?callback=test` in a browser. You should see `test({"updated":...,"packages":[...],"apps":[...],"projects":[...]})`. If there is no `"projects"` key you are still on an old deployment: Deploy > Manage deployments > Edit > Version: **New version** > Deploy. If you see a Google page instead of text, set "Who has access" to **Anyone**.
1. Open your `/exec` URL in a **private/incognito window**. You must see JSON immediately (no login page). If not: Deploy > Manage deployments > Edit > "Who has access: **Anyone**" > New version > Deploy.
2. Open your site with `?debug=1` (e.g. `/packages.html?debug=1`). A green/red badge at the bottom-left says whether the sheet loaded and how many packages/apps were found.
3. Tab names must be exactly `Packages` and `Apps`; row 1 must hold the column names.
4. After updating `Code.gs` (JSONP fallback), deploy a **New version**.

## Bangla for every page
Curated translations live in `data/i18n/bn.json`. Any text without a curated translation is translated automatically by the free Google Website Translator when a visitor selects Bangla (blog posts, project pages, etc.). Switching back to English reloads the page.
