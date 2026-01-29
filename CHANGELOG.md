# Changelog

All notable changes to this project will be documented in this file.

## v0.5.3 (2026-01-29)
- **Performance**: Search in category view now scores and sorts items in a single pass instead of double-scoring with separate filter and sort
- **Performance**: Search regex is precompiled once per query instead of recreated per item
- **Fix**: Temple offering rollback now restores altar detail and temple-status caches on mutation failure
- **Refactor**: AltarDetail uses shared `useUpdateTempleProgress` hook instead of duplicating optimistic update logic
- **Fix**: Temple overview optimistic update now includes per-altar offered counts when toggling from altar view
- **Fix**: Replaced `any` type in temple overview cache update with proper `TempleOverview` type

## v0.5.2 (2026-01-28)
- **Fix**: Cross-view cache sync — toggling item completion or temple offerings now instantly updates all views (Dashboard, Category, Temple, Altar) without network refetches
  - Category → Dashboard: completion stats update optimistically
  - Category ↔ Altar: temple offering toggles sync bidirectionally
  - Category/Altar → Temple Overview: offered item counts update optimistically
- **Feature**: Improved search with relevance scoring and fuzzy matching
  - Results ranked by: exact match → starts with → word boundary → substring → fuzzy
  - Applied to both global search (Ctrl+K) and category search
- **Fix**: Global search only activates when all category data is cached
- **Change**: Dev server now binds to `0.0.0.0` for network access

## v0.5.1 (2026-01-27)
- **Fix**: Session no longer invalidated when rate limited (429 errors)
  - Previously, hitting rate limit could cause session loss and 404 errors
  - Now only HTTP 401 is treated as invalid session
- **Fix**: React Query no longer retries on rate limit (429) or auth (401) errors
- **Change**: Increased rate limit from 100 to 500 requests per minute
- **Feature**: Added semantic versioning with version display in sidebar
  - Version number links to CHANGELOG on GitHub
  - Added `bun run version:patch/minor/major` scripts for version bumps

## v0.5.0
- **Global Search**: Quick search across all items, NPCs, altars, and temple offerings with `Ctrl+K` / `Cmd+K`
  - Autocomplete results with category badges
  - Keyboard navigation (arrow keys, Enter to select)
  - Navigates to item's page, scrolls to the item card, and opens its detail modal
  - Search temple offering sections (e.g., "Summer Sesajen", "Fresh Water Fish") to navigate directly to that section
- **Cooking Recipes**: New category for tracking cooking recipes
  - Scrapes recipe data from wiki including ingredients, utensil, energy/health restoration
  - Buff system with durations by quality tier (base, bronze, silver, gold, osmium)
  - Clean recipe source display (e.g., "Emily 4 ♥" instead of raw wiki text)
  - Filters: Utensil, Buff Type, Recipe Source, Energy Gain
- **Modal Improvements**: Cooking modal shows relevant info only (hides seasons/time)
- **Filter Enhancements**: Dynamic utensil filter for cooking category
- **Insects**: Added location filter with 16 spawn areas from the wiki
- **What's New Banner**: Shows changelog after updates so users know what's new
- **Fix**: What's New banner now properly shows after refresh using pending flag

## v0.4.0
- **Accessibility**: Comprehensive keyboard navigation system
  - Global shortcuts: `?` (help), `Shift+H/S/T` (navigation), `1-9`/`0` (categories), `/` (search)
  - Grid navigation: Arrow keys/hjkl, Enter/Space to toggle, `i` for details
  - Filter toolbar navigation with roving tabindex (ARIA toolbar pattern)
  - Temple page navigation: 2x2 altar grid, two-level offering navigation
- **Performance**: Persistent localStorage cache (7-day expiry)
  - Instant page loads after first visit - no network requests on refresh
  - Background prefetch of all data on app startup
  - Automatic cache invalidation on new deployments
- **UX**: Offline detection with warning banner
- **UX**: New version detection - banner prompts refresh after redeploy
- **Fix**: Altar prefetch now uses correct slugs

## v0.3.0
- Added NPC relationship tracking with heart-based progress
- Marriage candidate system with dating/married status
- Gift preferences display (loved, liked, disliked, hated)
- Fixed gift scraping to fetch from wiki Gifts section (excludes universal items)
- Dynamic filters that only show options with data
- Character type categories (Townie, Merperson, Giant, Stranger, Pet)
- Birthday and residence filtering for NPCs
- **Performance**: Virtualized grid rendering for large categories (e.g., 429 artisan products)
- **Performance**: React Query integration with 30-minute cache for data fetching
- **Refactor**: Shared UI components (ItemImage, LoadingSpinner, Modal, NoSaveSlotWarning)
- **Refactor**: Backend utility helpers for ownership verification and response formatting
- Completion animations restored for item cards

## v0.2.0
- Added Lake Temple offering tracking
- 4 altars with 18 total offerings
- Temple progress integrated with item cards
- Added Forageables category
- Added Artisan Products category with equipment filter
- Session-based authentication (no login required)
- Rate limiting and security headers
- Improved wiki scraper with better data extraction

## v0.1.0
- Initial release
- Basic item tracking for Fish, Insects, Critters, Crops, Artifacts, Gems
- Multiple save slots
- Season and time filtering
- Search functionality
- Progress statistics
- Responsive UI with collapsible sidebar
