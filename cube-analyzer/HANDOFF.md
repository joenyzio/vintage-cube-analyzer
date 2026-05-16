# Cube Analyzer - Handoff Document

## What This Is

A **Vintage Cube training and analysis app** for Magic: The Gathering. It helps players prepare for cube drafts through:
- Interactive draft simulation with AI opponents
- Training games to learn card evaluation
- Reference tools for archetypes, synergies, and power rankings
- Analytics on draft odds and matchups

**Tech Stack:** React + TypeScript + Vite + Tailwind CSS
**No backend** - all data is static JSON, persisted to localStorage

---

## Current Architecture

### Navigation Structure (4 sections, tab-based)

```
App.tsx
├── Dashboard (home)
│   └── Quick actions, getting started guide
├── Practice
│   ├── Draft Simulator (full 8-player draft sim)
│   └── Training Games (12+ mini-games)
├── Learn
│   ├── Archetypes (cube archetype breakdowns)
│   ├── Sample Decks (example builds)
│   ├── Draft Guide (strategy content)
│   └── Synergies (card combo explorer)
└── Reference
    ├── Cards (searchable card browser)
    ├── Power Rankings (ELO-based rankings)
    ├── Cube Overview (stats & charts)
    ├── Draft Odds (archetype probability calculator)
    └── Matchups (archetype vs archetype matrix)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app shell, navigation, section routing |
| `src/components/DraftSimulator.tsx` | Core draft logic (~1400 lines) |
| `src/components/DraftSimulator/*.tsx` | Extracted sub-components (menu, pack, coach, etc.) |
| `src/components/GamesPage.tsx` | Training games hub |
| `src/components/games/*.tsx` | Individual game implementations |
| `src/services/cardRating/*.ts` | Draft AI and card evaluation engine |
| `src/services/eloHelpers.ts` | ELO rating system utilities |
| `src/data/cards.json` | Full cube card data (360 cards) |
| `src/data/elo-ratings.json` | Card ELO ratings from 17lands |

### Draft Simulator Features
- 8-player draft simulation (you + 7 AI)
- Real-time coaching with pick recommendations
- Quiz mode (hide optimal pick, test yourself)
- Deck building after draft
- Achievement system
- Sound effects
- Undo functionality
- Mobile-responsive layout

---

## Current State & Known Issues

### Recently Completed
- [x] Restructured navigation from 16 pages to 4 sections with tabs
- [x] Added mobile bottom nav bar
- [x] "Start Draft" from Dashboard now auto-starts (no double-click)
- [x] Coaching visual indicators only show when coaching enabled
- [x] Added teaching context to Synergy Explorer
- [x] Added difficulty levels to training games

### Active Bug (needs fix)
- **Mobile draft: bottom nav blocks card selection**
  - The mobile card detail drawer doesn't account for the new bottom nav
  - Fix: Add `pb-20` padding to drawers/modals, or hide bottom nav during draft
  - Files: `src/components/DraftSimulator/MobileCardDetail.tsx`, `src/components/DraftSimulator/MobileDeckDrawer.tsx`

### Technical Debt
- `DraftSimulator.tsx` is ~1400 lines - could be further decomposed
- Bundle size warning (3.1MB) - needs code splitting
- `LandingPage.tsx` exists but is unused (was removed from App.tsx)

---

## Key Patterns

### State Management
- React useState/useEffect (no Redux)
- localStorage for persistence (draft history, achievements, stats)
- `useCubeData` hook loads card data on mount

### Styling
- Tailwind CSS with custom glass-morphism design
- Dark theme (black background, white/gray text)
- `glass-card` custom class for frosted glass effect
- Mobile-first responsive (`lg:` breakpoints for desktop)

### Mobile
- `isMobile` state detected via `window.innerWidth < 1024`
- Bottom nav bar (fixed position, z-50)
- Touch-friendly tap targets
- Drawers slide up from bottom

### Draft AI
- `src/services/cardRating/` contains the pick evaluation engine
- Uses ELO ratings + archetype signals + synergy detection
- `madruryEngine.ts` - main rating algorithm
- `draftIntelligence.ts` - contextual adjustments

---

## Running the Project

```bash
cd cube-analyzer
npm install
npm run dev     # Dev server on localhost:5173+
npm run build   # Production build
```

---

## What's Next (Suggested)

1. **Fix mobile bottom nav blocking** - immediate UX bug
2. **Code split** - lazy load sections to reduce bundle
3. **Delete unused LandingPage.tsx** or repurpose for sharing
4. **Add more sample decks** - currently minimal content
5. **Improve draft AI** - make opponents draft more realistically

---

## File Structure Overview

```
cube-analyzer/
├── src/
│   ├── App.tsx                 # Main app
│   ├── components/
│   │   ├── DraftSimulator.tsx  # Main draft orchestrator
│   │   ├── DraftSimulator/     # Sub-components
│   │   ├── games/              # Training game components
│   │   ├── charts/             # Recharts visualizations
│   │   └── ui/                 # Shared UI components
│   ├── services/
│   │   ├── cardRating/         # Draft AI engine
│   │   ├── analysis.ts         # Cube analysis utilities
│   │   ├── eloHelpers.ts       # ELO calculations
│   │   └── sounds.ts           # Audio feedback
│   ├── data/
│   │   ├── cards.json          # Cube card data
│   │   └── elo-ratings.json    # Card ELO ratings
│   ├── hooks/                  # React hooks
│   └── types/                  # TypeScript types
├── public/                     # Static assets
└── package.json
```

---

*Last updated: May 2026*
