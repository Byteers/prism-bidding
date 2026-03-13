# PRism — Live Auction Platform

Real-time bidding platform for college events. Supports 2 parallel classrooms with isolated auction state.

## Quick Start

```bash
npm install
node server/seed.js   # first time only — creates 25 teams + 6 items
node server/index.js
```

Open **http://localhost:3000**

## URLs

| Page | URL | Password |
|---|---|---|
| Login | `http://localhost:3000` | — |
| Room A Admin | `http://localhost:3000/admin?room=a` | `prism@admin` |
| Room B Admin | `http://localhost:3000/admin?room=b` | `prism@admin` |
| Room A Display | `http://localhost:3000/display?room=a` | — |
| Room B Display | `http://localhost:3000/display?room=b` | — |

## Team Credentials (after seed)

**Room A** (13 teams): alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lambda, mu, nu  
**Room B** (12 teams): xi, omicron, pi, rho, sigma, tau, upsilon, phi, chi, psi, omega, nexus

All team passwords follow the pattern: `teamid123` (e.g. `alpha` → `alpha123`)

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
PORT=3000
SESSION_SECRET=your-random-secret-here
ADMIN_PASSWORD=prism@admin
DB_DIR=.
ROOMS=a,b
```

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Open Railway shell → run `node server/seed.js`
5. Your live URL is ready

## Tech Stack

- Node.js + Express + Socket.IO
- sql.js (pure JS SQLite — no native compilation)
- Vanilla JS frontend, no build step
