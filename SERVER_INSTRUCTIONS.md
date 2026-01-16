# Backend Server Instructions

The `manama-next` application relies on a backend proxy server for:

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
