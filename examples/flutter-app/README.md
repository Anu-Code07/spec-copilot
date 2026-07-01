# Flutter Example — SpecDrive Walkthrough

Complete Kiro-style spec for a product review screen in a Flutter e-commerce app.

## What's included

```
.specdrive/
├── config.yaml
├── product.md
├── tech-stack.md
├── structure.md
├── coding-style.md
├── figma.json              # optional — link your Figma file
└── specs/product-review/
    ├── meta.yaml
    ├── requirements.md
    ├── gap-analysis.md     # sample gap analysis
    ├── design.md
    └── tasks.md
```

## Try the workflow (from repo root)

```bash
pnpm install && pnpm build

# Copy example into a temp project or use as reference
cd examples/flutter-app

# If SpecDrive CLI is built:
node ../../packages/cli/bin/spec.js doctor
node ../../packages/cli/bin/spec.js list
node ../../packages/cli/bin/spec.js status --spec product-review
node ../../packages/cli/bin/spec.js implement --spec product-review --next
```

## Task split (SpecDrive vs Design2Code)

| Task | Owner |
|------|-------|
| Scaffold screen, UI components | Design2Code (if Figma linked + `--auto-figma`) |
| Wire state / BLoC / navigation / tests | Cursor or Claude via `spec implement` context |

## Link Figma (optional)

Edit `.specdrive/figma.json`:

```json
{
  "fileKey": "YOUR_FIGMA_FILE_KEY"
}
```

Set token: `export FIGMA_TOKEN=figd_...` or `design2code login --figma-token ...`

## Next.js / React Native

Use the same `.specdrive/` layout. Run `spec init --stack nextjs` or `--stack react-native` in your app repo.
