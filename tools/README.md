# Adding a new package
1. Copy `data/packages/_template.json` -> `data/packages/<your-package>.json` and edit it.
   - status: `stable`, `beta` (detail page generated) or `planned` (card only).
2. Run from the repo root:  `python3 tools/build_packages.py`
3. Commit and push. `packages.html`, `packages/<slug>.html` and `sitemap.xml` update automatically.

# Founders & Our Story page
Edit `data/story.json` (chapters: year, title, text, optional image in /assets) and `data/founders.json`, then run
`python3 tools/build_founders.py`. Individual profiles: `prothes.html`, `shreyasi.html` (opened by clicking a name).
