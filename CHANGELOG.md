# Changelog

All notable changes to this project will be documented in this file.

## v0.5.0 (Current)
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
