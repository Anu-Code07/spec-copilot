# Enable GitHub Pages (fix 404)

Your `gh-pages` branch has the site files, but **GitHub Pages is not enabled** on the repo yet (API returns 404 for Pages config).

## Fix in 60 seconds

1. Open **https://github.com/Anu-Code07/spec-copilot/settings/pages**

2. Under **Build and deployment → Source**, select **Deploy from a branch**

3. Choose:
   - **Branch:** `main`
   - **Folder:** `/docs`

4. Click **Save**

5. Wait 1–3 minutes, then open:

   **https://anu-code07.github.io/spec-copilot/**

That URL loads **`docs/index.html`** as the homepage.

---

## Why you saw 404

| Check | Status |
|-------|--------|
| `docs/index.html` exists on `main` | Yes |
| `gh-pages` branch has `index.html` | Yes |
| GitHub Pages enabled in Settings | **No** — must be turned on manually |

Deploy workflows push files, but **nothing is served until Pages is enabled** in repo Settings.

---

## Requirements

- Repository must be **Public** (or GitHub Pro for private Pages)
- Only one Pages source active at a time — use **`main` / `docs`**

---

## Alternative: `gh-pages` branch

If you prefer the deploy workflow branch:

1. Settings → Pages → **Deploy from a branch**
2. Branch: **`gh-pages`**, Folder: **`/ (root)`**
3. Re-run **Actions → Deploy documentation site**

---

## Verify locally

```bash
cd docs
npx serve .
# http://localhost:3000 → index.html
```

---

## Still 404?

- Confirm repo name is exactly `spec-copilot` under `Anu-Code07`
- Hard-refresh or try incognito (CDN cache)
- Check **Settings → Pages** shows a green checkmark and published URL
- Ensure no custom domain is misconfigured under Pages settings
