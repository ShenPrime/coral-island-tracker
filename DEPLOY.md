# Coral Island Tracker - Railway Deployment Guide

## Architecture Overview

This is a **monorepo** with:
- **Backend** (`packages/backend`): Bun + Hono API server
- **Frontend** (`packages/frontend`): React + Vite SPA
- **Shared** (`packages/shared`): Shared TypeScript types

In production, the **backend serves both the API and the static frontend files**.

---

## Railway Setup (Step by Step)

### Step 1: Create a New Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `ShenPrime/coral-island-tracker`
5. Railway will create a service from your repo

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** button
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for the database to provision (takes ~30 seconds)

### Step 3: Configure the Main Service

Click on your main service (the GitHub repo one), then go to **"Settings"** tab:

#### Build Settings
| Setting | Value |
|---------|-------|
| **Build Command** | `bun install && bun run build:prod` |
| **Start Command** | `bun run start` |
| **Root Directory** | (leave empty) |

#### Watch Paths (optional)
```
packages/**
```

### Step 4: Set Environment Variables

Click on **"Variables"** tab and add these:

#### Required Variables

| Variable | Value | How to Get |
|----------|-------|------------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Click "Add Reference" → select your Postgres service → `DATABASE_URL` |
| `NODE_ENV` | `production` | Type manually |

#### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `ALLOWED_ORIGINS` | `*` | CORS: allow all origins (or set to your Railway domain) |
| `PORT` | (don't set) | Railway sets this automatically |

### Step 5: Link Database Reference

The `DATABASE_URL` variable needs to reference your Postgres service:

1. In Variables tab, click **"+ Add Variable"**
2. For the name, type: `DATABASE_URL`
3. For the value, click the **"Add Reference"** button (or type `${{Postgres.DATABASE_URL}}`)
4. Select your PostgreSQL service
5. Select `DATABASE_URL`

The value should look like: `${{Postgres.DATABASE_URL}}`

### Step 6: Deploy

1. Click **"Deploy"** button (or it may auto-deploy)
2. Watch the build logs for errors
3. Once deployed, click on the service URL to test

---

## Populating the Database

After deployment, the database tables are created automatically, but they're **empty**. You need to run the scraper to populate data.

### Option A: Run Locally Against Railway DB

1. Get your Railway DATABASE_URL:
   - Click on your PostgreSQL service
   - Go to "Connect" tab
   - Copy the "Public URL" (starts with `postgresql://`)

2. Run locally:
   ```bash
   DATABASE_URL="postgresql://..." bun run scrape fish
   DATABASE_URL="postgresql://..." bun run scrape insects
   DATABASE_URL="postgresql://..." bun run scrape critters
   DATABASE_URL="postgresql://..." bun run scrape crops
   DATABASE_URL="postgresql://..." bun run scrape artifacts
   DATABASE_URL="postgresql://..." bun run scrape gems
   DATABASE_URL="postgresql://..." bun run scrape forageables
   ```

3. Run temple migration:
   ```bash
   DATABASE_URL="postgresql://..." bun run db:migrate:temple-redesign
   ```

### Option B: Use Railway Shell

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link` (select your project)
4. Run commands:
   ```bash
   railway run bun run scrape fish
   railway run bun run scrape insects
   # ... etc
   railway run bun run db:migrate:temple-redesign
   ```

---

## Troubleshooting

### Build Fails with "bun not found"

Railway should auto-detect Bun from the lockfile. If not:

1. Make sure `bun.lockb` is committed to the repo
2. Or add a `nixpacks.toml` file (already included in repo)

### Database Connection Fails

1. Make sure `DATABASE_URL` variable is set correctly
2. Check it's a **reference** to the Postgres service, not a hardcoded value
3. The reference format is: `${{Postgres.DATABASE_URL}}`

### Frontend Shows Blank Page

1. Check build logs - frontend must build successfully
2. Verify `NODE_ENV=production` is set (required for serving static files)
3. Check that `packages/backend/public/` is created during build

### API Returns 404

1. Make sure the service is running (check logs)
2. Test the health endpoint: `https://your-app.railway.app/health`
3. Check CORS if calling from a different domain

---

## Environment Variables Summary

### Backend Service

| Variable | Required | Value |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Reference to Postgres (`${{Postgres.DATABASE_URL}}`) |
| `NODE_ENV` | Yes | `production` |
| `ALLOWED_ORIGINS` | No | `*` (or your domain) |
| `PORT` | No | Auto-set by Railway |

### Frontend

**No environment variables needed.** The frontend is built as static files and uses relative URLs (`/api/...`) which work automatically when served from the same origin as the backend.

### PostgreSQL

**No manual configuration needed.** Railway manages this automatically.

---

## Local Development

```bash
# Install dependencies
bun install

# Start local Postgres (or use Docker)
# Make sure DATABASE_URL is set in .env

# Run database setup
bun run db:setup

# Scrape wiki data
bun run scrape fish
bun run scrape insects
# ... etc

# Run temple migration
bun run db:migrate:temple-redesign

# Start development servers
bun run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001
