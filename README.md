# Coral Island Tracker

A comprehensive web-based progress tracker for the game Coral Island. Track your fish, insects, crops, artifacts, NPCs, Lake Temple offerings, and more across different playthroughs.

## Features

### Core Tracking
- **10 Categories**: Fish, Insects, Critters, Crops, Artifacts, Gems, Forageables, Artisan Products, Cooking, NPCs
- **Multiple Save Slots**: Track different playthroughs separately
- **Real-time Progress**: Visual progress bars with completion percentages
- **Wiki Integration**: Direct links to Coral Island Wiki for each item

### NPC Relationship System
- **Heart-based Friendship**: Track 0-10 hearts (0-14 for married partners)
- **Relationship Status**: Progress from Friends → Dating → Married
- **Marriage Candidates**: Clearly marked with special badges
- **Gift Preferences**: View loved, liked, disliked, and hated gifts
- **Character Info**: Birthday, residence, and character type

### Lake Temple Offerings
- **4 Altars**: Crop, Catch, Advanced, and Rare altars
- **18 Offerings**: Track individual offering requirements
- **Item Integration**: See which items are needed for temple offerings
- **Completion Rewards**: View rewards for completing each altar

### Smart Filtering
- **Category-specific Filters**: Each category shows only relevant filters
  - Fish: Season, Time, Location, Rarity
  - Crops: Season, Growth Time
  - Artisan Products: Season, Equipment
  - Cooking: Utensil, Buff Type, Recipe Source, Energy Gain
  - NPCs: Birthday Season, Character Type, Residence, Marriage Candidates
- **Price Sorting**: Sort by sell price (low to high or high to low)
- **Completion Filter**: Show all, completed only, or incomplete only
- **Search**: Quick search by item name

### User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Collapsible Sidebar**: More screen space when needed
- **Season Quick-filters**: Filter by current game season from sidebar
- **Animated Interactions**: Heart pop animations, card completion effects
- **Item Modals**: Detailed view with all item information

### Technical Features
- **Session-based Storage**: No login required - your data persists via browser session
- **Persistent Cache**: Data cached to localStorage for instant loads across page refreshes
- **Background Prefetch**: All data loaded in background on startup for instant navigation
- **Offline Detection**: Warning banner when offline - prevents lost changes
- **Auto-invalidation**: Cache automatically refreshes when new version is deployed
- **Rate Limiting**: 100 requests per minute to prevent abuse
- **Security Headers**: XSS protection, clickjacking prevention, content security

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Bun + Hono (lightweight web framework)
- **Database**: PostgreSQL (via postgres.js)
- **State Management**: Zustand (with persistence)
- **Data Fetching**: React Query with localStorage persistence
- **Icons**: Lucide React

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [PostgreSQL](https://www.postgresql.org/) 14+ (local or hosted)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/coral-island-tracker.git
cd coral-island-tracker
bun install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# Required - PostgreSQL connection string
DATABASE_URL=postgres://username:password@localhost:5432/coral_tracker

# Optional - defaults shown
PORT=3001
ALLOWED_ORIGINS=*
```

### 3. Set Up Database

```bash
# Create tables
bun run db:setup

# Seed with game data (or use the scraper)
bun run db:seed
```

### 4. Scrape Wiki Data (Recommended)

Populate the database with real game data from the Coral Island Wiki:

```bash
# Scrape all categories
bun run scrape fish
bun run scrape insects
bun run scrape critters
bun run scrape crops
bun run scrape artifacts
bun run scrape gems
bun run scrape forageables
bun run scrape artisan-products
bun run scrape npcs
bun run scrape cooking
```

### 5. Run Migrations

Apply any pending database migrations:

```bash
# Run specific migrations as needed
bun run packages/backend/src/db/migrations/003_temple_redesign.ts
bun run packages/backend/src/db/migrations/005_add_sessions.ts
bun run packages/backend/src/db/migrations/006_add_npc_progress.ts
```

### 6. Start Development

```bash
# Start both frontend and backend
bun run dev

# Or start separately:
bun run dev:backend   # API on http://localhost:3001
bun run dev:frontend  # UI on http://localhost:5173
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | `3001` | Backend server port |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated list of allowed CORS origins |

**Example for production:**
```env
DATABASE_URL=postgres://user:pass@db.example.com:5432/coral_tracker
PORT=3001
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
```

## Project Structure

```
coral-island-tracker/
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── db/
│   │       │   ├── migrations/       # Database migrations
│   │       │   ├── setup.ts          # Table creation
│   │       │   ├── seed.ts           # Sample data seeding
│   │       │   └── index.ts          # DB connection
│   │       ├── middleware/
│   │       │   ├── rateLimit.ts      # Rate limiting
│   │       │   └── session.ts        # Session management
│   │       ├── routes/
│   │       │   ├── categories.ts     # Category endpoints
│   │       │   ├── items.ts          # Item endpoints
│   │       │   ├── saves.ts          # Save slot endpoints
│   │       │   ├── progress.ts       # Progress tracking
│   │       │   ├── temple.ts         # Lake Temple endpoints
│   │       │   ├── npcs.ts           # NPC relationship endpoints
│   │       │   └── session.ts        # Session endpoints
│   │       └── index.ts              # Server entry point
│   │
│   ├── frontend/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── Layout.tsx        # Sidebar + navigation
│   │       │   ├── FilterBar.tsx     # Smart category filtering
│   │       │   ├── ItemCard.tsx      # Item display card
│   │       │   ├── ItemModal.tsx     # Item detail modal
│   │       │   ├── NPCCard.tsx       # NPC card with hearts
│   │       │   ├── NPCModal.tsx      # NPC detail modal
│   │       │   ├── HeartDisplay.tsx  # Animated heart icons
│   │       │   ├── ProgressBar.tsx   # Progress visualization
│   │       │   ├── AltarCard.tsx     # Temple altar card
│   │       │   └── OfferingSection.tsx
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx     # Home with stats
│   │       │   ├── SaveSlots.tsx     # Save management
│   │       │   ├── TrackCategory.tsx # Main tracking page
│   │       │   ├── LakeTempleOverview.tsx
│   │       │   └── AltarDetail.tsx
│   │       ├── store/
│   │       │   └── useStore.ts       # Zustand state management
│   │       └── lib/
│   │           ├── api.ts            # API client
│   │           └── session.ts        # Session utilities
│   │
│   └── shared/
│       └── src/
│           └── index.ts              # Shared TypeScript types
│
├── scripts/
│   └── scrape-wiki.ts                # Wiki data scraper
│
├── .env                              # Environment variables
└── package.json                      # Workspace configuration
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start frontend + backend in development mode |
| `bun run dev:backend` | Start only the backend API server |
| `bun run dev:frontend` | Start only the frontend dev server |
| `bun run build` | Build frontend for production |
| `bun run start` | Start production backend server |
| `bun run db:setup` | Create database tables |
| `bun run db:seed` | Seed database with sample data |
| `bun run scrape <category>` | Scrape wiki data for a category |

## Wiki Scraper

The scraper fetches real game data from the Coral Island Wiki.

### Usage

```bash
# Scrape a specific category
bun run scrape fish
bun run scrape npcs

# Fast mode - only fetch category data, skip individual pages
bun run scrape fish --fast

# Clear existing data before scraping
bun run scrape fish --clear

# Combine flags
bun run scrape crops --fast --clear
```

### Available Categories

| Category | Data Extracted |
|----------|---------------|
| `fish` | Name, seasons, time, location, rarity, sell price |
| `insects` | Name, seasons, time, rarity, sell price |
| `critters` | Name, seasons, time, rarity, sell price |
| `crops` | Name, seasons, growth time, sell price |
| `artifacts` | Name, rarity, description |
| `gems` | Name, rarity, sell price |
| `forageables` | Name, seasons, locations, sell price |
| `artisan-products` | Name, equipment needed, seasons, sell price |
| `npcs` | Name, birthday, residence, character type, marriage status, gift preferences |
| `cooking` | Name, utensil, ingredients, energy/health restored, buffs with durations, recipe source |

### Notes

- The scraper includes a 500ms delay between requests to be respectful to the wiki
- Some data may need manual verification as wiki formatting varies
- Run without `--fast` for the most complete data

## API Endpoints

All protected endpoints require the `X-Session-ID` header.

### Session

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/session` | No | Get or create session ID |

### Categories & Items

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | No | List all categories |
| GET | `/api/categories/:slug` | No | Get category with item count |
| GET | `/api/items` | No | List items (supports filters) |
| GET | `/api/items/:id` | No | Get single item details |

### Save Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saves` | Yes | List user's save slots |
| POST | `/api/saves` | Yes | Create new save slot |
| GET | `/api/saves/:id` | Yes | Get save slot with stats |
| PATCH | `/api/saves/:id` | Yes | Rename save slot |
| DELETE | `/api/saves/:id` | Yes | Delete save slot |

### Progress Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/progress/:saveId/items` | Yes | Get items with completion status |
| PUT | `/api/progress/:saveId/:itemId` | Yes | Update item completion |
| POST | `/api/progress/:saveId/bulk` | Yes | Bulk update multiple items |

### Lake Temple

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/temple/altars` | Yes | Get all altars with progress |
| GET | `/api/temple/altars/:slug` | Yes | Get altar details and offerings |
| PUT | `/api/temple/progress/:reqId` | Yes | Toggle offering completion |
| GET | `/api/temple/item/:itemId` | Yes | Get item's temple requirements |
| GET | `/api/temple/items-status` | Yes | Batch get temple status for items |

### NPCs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/npcs/:saveId` | Yes | Get all NPCs with heart progress |
| GET | `/api/npcs/:saveId/stats` | Yes | Get NPC completion statistics |
| PUT | `/api/npcs/:saveId/:npcId` | Yes | Update hearts and relationship status |
| POST | `/api/npcs/:saveId/:npcId/increment` | Yes | Add 1 heart |
| POST | `/api/npcs/:saveId/:npcId/decrement` | Yes | Remove 1 heart |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server and database health status |

## Database Migrations

Migrations are run manually as needed:

| Migration | Description | Command |
|-----------|-------------|---------|
| 001 | Add forageables category | `bun run db:migrate` |
| 002 | Add Lake Temple base | `bun run db:migrate:temple` |
| 003 | Temple redesign with offerings | `bun run db:migrate:temple-redesign` |
| 004 | Add artisan products | `bun run packages/backend/src/db/migrations/004_add_artisan_products.ts` |
| 005 | Add sessions table | `bun run packages/backend/src/db/migrations/005_add_sessions.ts` |
| 006 | Add NPC progress table | `bun run packages/backend/src/db/migrations/006_add_npc_progress.ts` |

## Categories

| Category | Description | Special Features |
|----------|-------------|------------------|
| Fish | Ocean, river, lake, and cavern fish | Location + time filters |
| Insects | Bugs and butterflies | Time of day filter |
| Critters | Small animals to catch | Seasonal availability |
| Crops | Plantable crops | Growth time filter |
| Artifacts | Diggable artifacts | Rarity-based |
| Gems | Mineable gems and minerals | Rarity-based |
| Forageables | Wild items to collect | Location filter |
| Artisan Products | Crafted goods | Equipment filter |
| Cooking | Food and drink recipes | Utensil, buff type, energy gain, recipe source filters |
| NPCs | Villagers and characters | Heart-based tracking, relationship status |

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature: `git checkout -b feature/my-feature`
4. **Install dependencies**: `bun install`
5. **Make your changes** and test locally
6. **Commit** with a descriptive message
7. **Push** to your fork
8. **Open a Pull Request** against the main repository

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components focused and reusable
- Add types to the shared package when needed

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## Future Enhancements

- [ ] Save file import (parse Coral Island save files)
- [ ] Export/import progress as JSON
- [ ] Calendar integration (birthdays, seasonal events)
- [ ] Achievement tracking
- [x] Cooking recipes tracking
- [ ] Museum collection tracking
- [ ] Diving location tracking
- [ ] Farm animal tracking

## License

MIT
