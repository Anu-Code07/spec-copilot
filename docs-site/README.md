# SpecDrive documentation site

Static documentation site for [GitHub Pages](https://pages.github.com/).

**Live URL:** https://anu-code07.github.io/spec-copilot/

## Local preview

```bash
cd docs-site
npx serve .
# Open http://localhost:3000  → serves index.html as homepage
```

## GitHub Pages setup (required once)

The deploy workflow pushes `docs-site/` to the **`gh-pages`** branch.

1. Go to **https://github.com/Anu-Code07/spec-copilot/settings/pages**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. **Branch:** `gh-pages` · **Folder:** `/ (root)`
4. Click **Save**
5. Re-run the workflow: **Actions → Deploy documentation site → Run workflow**

After ~1 minute, the site is live at:

**https://anu-code07.github.io/spec-copilot/**

(`index.html` is the homepage — no extra path needed.)

## Troubleshooting

### `Failed to create deployment (status: 404)`

This happens when **GitHub Actions** is selected as the Pages source but Pages is not fully enabled.

**Fix:** Use **Deploy from a branch** → `gh-pages` → `/ (root)` as described above (this repo's workflow uses the `gh-pages` branch, not the Actions artifact method).

### Site shows 404 after deploy

- Wait 2–5 minutes for DNS/cache
- Confirm `gh-pages` branch exists and contains `index.html` at root
- Confirm Pages source points to `gh-pages` / root

## Pages

| File | URL path |
|------|----------|
| `index.html` | `/` |
| `getting-started.html` | `/getting-started.html` |
| `cli.html` | `/cli.html` |
| `mcp.html` | `/mcp.html` |
| `spec-format.html` | `/spec-format.html` |

## Structure

```
docs-site/
├── index.html          ← homepage (required for GitHub Pages)
├── getting-started.html
├── cli.html
├── mcp.html
├── spec-format.html
├── styles.css
├── script.js
└── .nojekyll
```

No build step — plain HTML/CSS/JS.
