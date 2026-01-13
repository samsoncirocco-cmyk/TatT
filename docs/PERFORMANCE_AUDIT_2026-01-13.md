# TatT Performance Audit - Lighthouse (The Forge)

Scope: Lighthouse run against /generate using desktop preset.

## Environment
- URL: http://127.0.0.1:4173/generate
- Mode: Vite preview (production build)
- Form factor: desktop
- Command:
  - npx lighthouse http://127.0.0.1:4173/generate --output=json --output=html --output-path=artifacts/lighthouse/generate-preview --preset=desktop --chrome-flags="--headless=new" --no-enable-error-reporting

## Summary
- Performance score: 0.94
- Accessibility score: 0.92
- Best Practices score: 1.00
- SEO score: 0.92

## Key Metrics
- First Contentful Paint: 0.9 s (score 0.9)
- Largest Contentful Paint: 1.2 s (score 0.88)
- Speed Index: 0.9 s (score 0.98)
- Total Blocking Time: 130 ms (score 0.93)
- Cumulative Layout Shift: 0 (score 1)

## Notes
- Performance is from production build preview. Re-run on deployed environment for final launch scores.

## Artifacts
- HTML report: artifacts/lighthouse/generate-preview.report.html
- JSON report: artifacts/lighthouse/generate-preview.report.json

## Previous Dev Run (for reference)
- URL: http://127.0.0.1:5173/generate
- Performance score: NOT COMPUTED (NO_LCP)
- Accessibility score: 0.92
- Best Practices score: 1.00
- SEO score: 0.92
- HTML report: artifacts/lighthouse/generate.report.html
- JSON report: artifacts/lighthouse/generate.report.json
