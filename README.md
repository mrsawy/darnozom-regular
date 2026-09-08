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

## Production CI/CD

Pushing to the `production` branch builds the site and deploys it to the server via GitHub Actions.

**Live URL:** https://darnozom.com/

### GitHub Secrets (required)

Repo → **Settings → Secrets and variables → Actions** — add:

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `13.140.148.197` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Full contents of the deploy **private** key (see below) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (`pk_…`) |
| `DEPLOY_DOMAIN` | `darnozom.com` (optional — default) |
| `DEPLOY_SSL_EMAIL` | `info@darnozom.com` (optional — Let's Encrypt notices) |

### Deploy key

A key pair was generated for CI (`github-actions-darnozom-deploy`). The **public** key is already on the server. Put the **private** key into `DEPLOY_SSH_KEY` (entire PEM, including `BEGIN`/`END` lines).

Never commit private keys or server passwords to git.

### Deploy flow

1. Merge/push to `production`
2. Action builds with `pnpm build`
3. Uploads `dist/` → `/var/www/darnozom`
4. Issues/renews Let's Encrypt SSL for `darnozom.com` + `www`
5. Installs nginx HTTPS config and reloads

You can also run the workflow manually: **Actions → Deploy Production → Run workflow**.

## Notes

- API calls go to `/api/*`. In production, enable the `/api` proxy block in `deploy/nginx.conf` when the backend is ready.
- Set `VITE_CLERK_PUBLISHABLE_KEY` for sign-in / admin. Without it, public pages still work.
- HTTP (`:80`) redirects to HTTPS. Certs auto-renew via `certbot.timer`.