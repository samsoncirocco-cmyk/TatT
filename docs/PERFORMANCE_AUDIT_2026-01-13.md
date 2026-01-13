# TatT Performance Audit - Lighthouse (The Forge)

Scope: Lighthouse run against /generate using desktop preset.

## Environment
- URL: http://127.0.0.1:5173/generate
- Mode: dev server (Vite)
- Form factor: desktop
- Command:
  - npx lighthouse http://127.0.0.1:5173/generate --output=json --output=html --output-path=artifacts/lighthouse/generate --preset=desktop --chrome-flags="--headless=new"

## Summary
- Performance score: NOT COMPUTED (NO_LCP)
- Accessibility score: 0.92
- Best Practices score: 1.00
- SEO score: 0.92

## Key Metrics
- First Contentful Paint: 5.4 s (score 0)
- Largest Contentful Paint: N/A (NO_LCP)
- Speed Index: 6.1 s (score 0.01)
- Total Blocking Time: N/A (NO_LCP)
- Cumulative Layout Shift: 0 (score 1)

## Notes
- Lighthouse reported NO_LCP; performance category could not be computed.
- Dev server + headless conditions can skew scores. For release-grade metrics, re-run against a production build.

## Artifacts
- HTML report: artifacts/lighthouse/generate.report.html
- JSON report: artifacts/lighthouse/generate.report.json
