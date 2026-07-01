# SpecDrive documentation site

Static documentation site for [GitHub Pages](https://pages.github.com/).

## Local preview

```bash
cd docs-site
npx serve .
# Open http://localhost:3000
```

Or with Python:

```bash
cd docs-site && python3 -m http.server 8080
```

## GitHub Pages setup

1. Push to `main` — the **Deploy documentation site** workflow publishes automatically.
2. In repo **Settings → Pages → Build and deployment**:
   - Source: **GitHub Actions**
3. Site URL: `https://anu-code07.github.io/spec-copilot/`

## Pages

| File | Content |
|------|---------|
| `index.html` | Landing page |
| `getting-started.html` | Install and first workflow |
| `cli.html` | CLI command reference |
| `mcp.html` | Cursor & Claude MCP setup |
| `spec-format.html` | Spec document format |

## Structure

```
docs-site/
├── index.html
├── getting-started.html
├── cli.html
├── mcp.html
├── spec-format.html
├── styles.css
├── script.js
└── .nojekyll          # Disable Jekyll processing
```

No build step required — plain HTML/CSS/JS.
