# Darnozom Website

Standalone React + Vite frontend for Darnozom (دار نظم).

## Setup

```bash
pnpm install   # or: npm install
cp .env.example .env
pnpm dev
```

App runs at http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | TypeScript check only |

## Notes

- API calls go to `/api/*`. In dev, Vite proxies them to `VITE_API_PROXY_TARGET` (default `http://localhost:3000`).
- Set `VITE_CLERK_PUBLISHABLE_KEY` for sign-in / admin. Without it, public pages still work.
