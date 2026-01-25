# Coral Island Tracker

A web-based progress tracker for the game Coral Island. Track your fish, bugs, crops, artifacts, and more across different playthroughs.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Bun + Hono
- **Database**: PostgreSQL (native SQL via postgres.js)
- **State Management**: Zustand

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [PostgreSQL](https://www.postgresql.org/) 14+

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up PostgreSQL

Make sure PostgreSQL is running. If installed via Scoop:

```bash
# Start PostgreSQL
pg_ctl -D ~/scoop/apps/postgresql/current/data start

# Create the database
createdb -U postgres coral_tracker
```

### 3. Configure Environment

The `.env` file is already set up with defaults. Modify if needed:

```env
DATABASE_URL=postgres://postgres@localhost:5432/coral_tracker
PORT=3001
VITE_API_URL=http://localhost:3001
```

### 4. Initialize Database

```bash
# Create tables
bun run db:setup

# Seed with sample data
bun run db:seed
```

### 5. Start Development

```bash
# Start both frontend and backend
bun run dev

# Or start them separately:
bun run dev:backend  # API on http://localhost:3001
bun run dev:frontend # UI on http://localhost:5173
```

## Project Structure

```
coral-island-tracker/
├── packages/
│   ├── backend/          # Bun + Hono API
│   │   └── src/
│   │       ├── db/       # Database setup & queries
│   │       ├── routes/   # API endpoints
│   │       └── index.ts  # Entry point
│   │
│   ├── frontend/         # React + Vite app
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── hooks/
│   │       ├── store/
│   │       └── lib/
│   │
│   └── shared/           # Shared TypeScript types
│
└── scripts/
    └── scrape-wiki.ts    # Wiki scraper for game data
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start both frontend and backend in development mode |
| `bun run dev:backend` | Start only the backend API |
| `bun run dev:frontend` | Start only the frontend |
| `bun run build` | Build for production |
| `bun run db:setup` | Create database tables |
| `bun run db:seed` | Seed with sample game data |
| `bun run scrape` | Scrape wiki for game data (experimental) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/categories` | List all categories |
| GET | `/api/items` | List items (with filters) |
| GET | `/api/items/:id` | Get single item |
| GET | `/api/saves` | List save slots |
| POST | `/api/saves` | Create save slot |
| GET | `/api/saves/:id` | Get save slot with stats |
| DELETE | `/api/saves/:id` | Delete save slot |
| GET | `/api/progress/:saveId/items` | Get items with progress |
| PUT | `/api/progress/:saveId/:itemId` | Update item completion |

## Features

- **Multiple Save Slots**: Track different playthroughs separately
- **Category Tracking**: Fish, Insects, Critters, Crops, Artifacts, Gems, Cooking, NPCs
- **Filtering**: By season, time of day, weather, completion status
- **Search**: Find items quickly
- **Progress Stats**: See completion percentages per category
- **Responsive Design**: Works on desktop and mobile

## Future Enhancements

- [ ] Save file import (parse Coral Island save files)
- [ ] Export/import progress as JSON
- [ ] Dark mode toggle
- [ ] NPC gift preferences
- [ ] Calendar integration
- [ ] Achievement tracking

## License

MIT
