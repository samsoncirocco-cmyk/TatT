# TatT demo mode

The old `/demo` scripted mock route was removed in PR #211. Do not use
screenshots or behavior from that archived surface as product evidence.

## `NEXT_PUBLIC_DEMO_MODE=true`: real design-session path with demo adapters

Environment demo mode exercises the real design-session orchestration while
substituting deterministic or free behavior at expensive seams:

- The conversation engine uses a deterministic demo script.
- Session persistence and validation still run.
- Confirmation and refinement still use the real session flow.
- Generation returns demo assets rather than spending against image providers.
- Rate, budget, and spend recording are skipped for free demo operations.
- Placement preview avoids Google Cloud Storage and can use the development
  fallback.

This mode is tested under the design-conversation and design-session suites.
It is the preferred no-credentials path for validating the current `/design`
journey.

## Setup

```bash
npm install --legacy-peer-deps
cp env.demo .env.local
npm run dev
```

Then open `/design` to exercise the real design-session flow with demo
adapters.

## What demo mode does not prove

- Real image-provider output quality
- Live provider fallback behavior
- Real semantic or graph matching
- Real authentication
- Google Cloud Storage writes
- Stripe or Stripe Connect behavior
- Google Calendar authorization or event creation
- Anatomical AR tracking, which is not a current feature

## Verification evidence

- `src/services/designConversation/internal/demoScript.ts`
- `src/services/designConversation/__tests__/conversationEngine.test.ts`
- `src/app/api/v1/design-session/__tests__/demo-confirm-flow.test.ts`
- `src/app/api/v1/design-session/route.ts`
- `src/app/api/v1/design-session/converse/route.ts`
- `src/app/api/v1/design-session/[id]/confirm/route.ts`
- `src/app/api/v1/design-session/[id]/refine/route.ts`
