---
status: historical
retired_on: 2026-07-27
superseded_by: directives/deploy.md
---

> **Historical document — does not describe the live system.** The Railway
> Express proxy (`server.js`) documented below was retired from the repo on
> 2026-07-27 (commit `942c00b`, "chore: retire the Railway Express proxy from
> the repo"); `server.js` no longer exists in this repository. TatT now
> deploys exclusively to Vercel, with Next.js API routes under
> `src/app/api/` as the sole backend — see `directives/deploy.md` for the
> current, authoritative deploy procedure. This page is retained only as
> historical/architectural context and must not be followed as setup
> instructions.

# Backend Server Instructions

The TatT application relies on a backend proxy server for:

- API Key security (Replicate, Neo4j)
- Rate limiting
- CORS handling
- File uploads

## Running the Server

We have migrated `server.js` to this directory. You can run it directly:

```bash
npm run server
```

This will start the server on **<http://127.0.0.1:3002>**.

## Running the Frontend

In a separate terminal:

```bash
npm run dev
```

The frontend will perform API calls to `htpp://127.0.0.1:3002/api` (proxied request) which will then be forwarded to external services like Replicate/Neo4j.

## Troubleshooting

- **Port Conflicts**: If port 3002 is in use, edit `.env.local` to change `NEXT_PUBLIC_PROXY_URL` and `server.js` `PORT` variable.
- **Connection Refused**: Ensure `npm run server` is actually running.
- **CORS Errors**: Check `ALLOWED_ORIGINS` in `server.js` includes your frontend URL (e.g., `http://localhost:3000`).
