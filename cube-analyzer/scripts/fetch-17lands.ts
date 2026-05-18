#!/usr/bin/env npx tsx
/**
 * 17lands Win Rate Data Fetcher
 *
 * Fetches win rate data from 17lands.com for the Arena Powered Cube.
 * Includes global IWD and color-filtered IWD for archetype-aware coaching.
 *
 * Usage:
 *   npx tsx scripts/fetch-17lands.ts
 *   npx tsx scripts/fetch-17lands.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Configuration
// ============================================

const API_BASE = 'https://www.17lands.com/card_ratings/data';
const EXPANSION = 'Cube - Powered';
const FORMAT = 'PremierDraft';

// Color combinations to fetch (WUBRG order required by API)
// Focus on common cube archetypes
const COLOR_COMBOS = [
  // Two-color (most common in cube) - WUBRG sorted
  'WU', 'WB', 'WR', 'WG',  // White pairs
  'UB', 'UR', 'UG',        // Blue pairs (non-white)
  'BR', 'BG',              // Black pairs (non-white/blue)
  'RG',                    // Red-Green
  // Three-color (common combo/control shells) - WUBRG sorted
  'WUB', 'WUR', 'WUG',     // Esper, Jeskai, Bant
  'WBR', 'WBG',            // Mardu, Abzan
  'WRG',                   // Naya
  'UBR', 'UBG',            // Grixis, Sultai
  'URG',                   // Temur
  'BRG',                   // Jund
];

// Minimum game count for reliable IWD
const MIN_GAMES_GLOBAL = 500;
const MIN_GAMES_COLOR = 200;  // Lower threshold for color-filtered

// ============================================
// Types
// ============================================

interface Raw17landsCard {
  name: string;
  mtga_id: number;
  color: string;
  rarity: string;
  url: string;
  types: string[];
  seen_count: number;
  avg_seen: number | null;
  pick_count: number;
  avg_pick: number | null;
  game_count: number;
  pool_count: number;
  play_rate: number | null;
  win_rate: number | null;
  opening_hand_game_count: number;
  opening_hand_win_rate: number | null;
  drawn_game_count: number;
  drawn_win_rate: number | null;
  ever_drawn_game_count: number;
  ever_drawn_win_rate: number | null;
  never_drawn_game_count: number;
  never_drawn_win_rate: number | null;
  drawn_improvement_win_rate: number | null;
}

interface WinRateCard {
  gihWR: number | null;        // Games In Hand Win Rate
  iwd: number | null;          // Improvement When Drawn (the gold metric)
  avgPick: number | null;      // Average pick position
  gameCount: number;           // Sample size
  playRate: number | null;     // % of time card makes the deck
  iwdByColor: Record<string, { iwd: number | null; games: number }>;
}

interface WinRateData {
  metadata: {
    fetchedAt: string;
    expansion: string;
    format: string;
    totalCards: number;
    cardsWithIWD: number;
    colorCombosIncluded: string[];
    source: string;
  };
  cards: Record<string, WinRateCard>;
  missingCards: {
    name: string;
    reason: 'not_in_arena' | 'low_sample' | 'name_mismatch';
  }[];
}

// ============================================
// Name Normalization
// ============================================

/**
 * Normalize card names for matching between cube and 17lands.
 * Handles Adventure cards, split cards, DFCs, and parenthetical text.
 */
function normalizeCardName(name: string): string[] {
  const variants: string[] = [name];

  // Adventure/Split cards: "Bonecrusher Giant // Stomp" ↔ "Bonecrusher Giant"
  if (name.includes(' // ')) {
    const [front, back] = name.split(' // ');
    variants.push(front.trim());
    variants.push(back.trim());
  }

  // Parenthetical text: "Jace, the Mind Sculptor (Borderless)"
  const withoutParens = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (withoutParens !== name) {
    variants.push(withoutParens);
  }

  // Lowercase variants
  const lowercaseVariants = variants.map(v => v.toLowerCase());

  return [...new Set([...variants, ...lowercaseVariants])];
}

/**
 * Build a lookup map from 17lands data with normalized names
 */
function buildLookup(cards: Raw17landsCard[]): Map<string, Raw17landsCard> {
  const lookup = new Map<string, Raw17landsCard>();

  for (const card of cards) {
    const variants = normalizeCardName(card.name);
    for (const variant of variants) {
      lookup.set(variant, card);
    }
  }

  return lookup;
}

/**
 * Find a card in 17lands data using normalized name matching
 */
function findCard(
  cubeName: string,
  lookup: Map<string, Raw17landsCard>
): Raw17landsCard | null {
  for (const variant of normalizeCardName(cubeName)) {
    const card = lookup.get(variant);
    if (card) return card;
  }
  return null;
}

// ============================================
// API Fetching
// ============================================

async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 2000
): Promise<Raw17landsCard[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as Raw17landsCard[];
    } catch (error) {
      console.error(`  Attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        console.log(`  Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  return [];
}

async function fetchGlobalData(): Promise<Raw17landsCard[]> {
  const url = `${API_BASE}?expansion=${encodeURIComponent(EXPANSION)}&format=${FORMAT}`;
  console.log(`Fetching global data from 17lands...`);
  const data = await fetchWithRetry(url);
  console.log(`  Received ${data.length} cards`);
  return data;
}

async function fetchColorData(colors: string): Promise<Raw17landsCard[]> {
  const url = `${API_BASE}?expansion=${encodeURIComponent(EXPANSION)}&format=${FORMAT}&colors=${colors}`;
  const data = await fetchWithRetry(url);
  return data;
}

// ============================================
// Main Processing
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           17LANDS WIN RATE DATA FETCHER');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Load cube cards
  const cubeDataPath = path.join(__dirname, '../src/data/cards.json');
  const cubeData = JSON.parse(fs.readFileSync(cubeDataPath, 'utf-8'));
  const cubeCards: string[] = cubeData.map((c: { name: string }) => c.name);
  console.log(`Cube contains ${cubeCards.length} cards`);

  // Fetch global data
  const globalData = await fetchGlobalData();
  const globalLookup = buildLookup(globalData);

  // Initialize result structure
  const result: WinRateData = {
    metadata: {
      fetchedAt: new Date().toISOString(),
      expansion: EXPANSION,
      format: FORMAT,
      totalCards: 0,
      cardsWithIWD: 0,
      colorCombosIncluded: COLOR_COMBOS,
      source: 'https://17lands.com',
    },
    cards: {},
    missingCards: [],
  };

  // Process each cube card against global data
  console.log('\nMatching cube cards to 17lands data...');
  let matched = 0;
  let hasIWD = 0;

  for (const cubeName of cubeCards) {
    const card = findCard(cubeName, globalLookup);

    if (!card) {
      result.missingCards.push({
        name: cubeName,
        reason: 'not_in_arena',
      });
      continue;
    }

    matched++;

    const winRateCard: WinRateCard = {
      gihWR: card.ever_drawn_win_rate,
      iwd: card.drawn_improvement_win_rate,
      avgPick: card.avg_pick,
      gameCount: card.ever_drawn_game_count || 0,
      playRate: card.play_rate,
      iwdByColor: {},
    };

    if (winRateCard.iwd !== null && winRateCard.gameCount >= MIN_GAMES_GLOBAL) {
      hasIWD++;
    } else if (winRateCard.gameCount < MIN_GAMES_GLOBAL) {
      result.missingCards.push({
        name: cubeName,
        reason: 'low_sample',
      });
    }

    result.cards[cubeName] = winRateCard;
  }

  console.log(`  Matched: ${matched}/${cubeCards.length} (${Math.round(matched * 100 / cubeCards.length)}%)`);
  console.log(`  Has IWD: ${hasIWD}/${cubeCards.length} (${Math.round(hasIWD * 100 / cubeCards.length)}%)`);

  // Fetch color-filtered data for archetype-aware IWD
  console.log('\nFetching color-filtered IWD data...');

  for (const colors of COLOR_COMBOS) {
    process.stdout.write(`  ${colors}...`);

    try {
      // Rate limiting: wait between requests
      await new Promise(r => setTimeout(r, 500));

      const colorData = await fetchColorData(colors);
      const colorLookup = buildLookup(colorData);

      let colorMatches = 0;

      for (const cubeName of cubeCards) {
        if (!result.cards[cubeName]) continue;

        const colorCard = findCard(cubeName, colorLookup);
        if (colorCard && colorCard.ever_drawn_game_count >= MIN_GAMES_COLOR) {
          result.cards[cubeName].iwdByColor[colors] = {
            iwd: colorCard.drawn_improvement_win_rate,
            games: colorCard.ever_drawn_game_count,
          };
          colorMatches++;
        }
      }

      console.log(` ${colorMatches} cards with data`);
    } catch (error) {
      console.log(` FAILED`);
    }
  }

  // Update metadata
  result.metadata.totalCards = matched;
  result.metadata.cardsWithIWD = hasIWD;

  // Generate coverage report
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    COVERAGE REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total cube cards: ${cubeCards.length}`);
  console.log(`Matched to 17lands: ${matched} (${Math.round(matched * 100 / cubeCards.length)}%)`);
  console.log(`Has reliable IWD (500+ games): ${hasIWD} (${Math.round(hasIWD * 100 / cubeCards.length)}%)`);
  console.log(`Missing from 17lands: ${result.missingCards.length} (${Math.round(result.missingCards.length * 100 / cubeCards.length)}%)`);

  // Categorize missing cards
  const missingByReason: Record<string, string[]> = {
    'not_in_arena': [],
    'low_sample': [],
    'name_mismatch': [],
  };

  for (const missing of result.missingCards) {
    missingByReason[missing.reason].push(missing.name);
  }

  console.log('\nMissing cards by reason:');
  console.log(`  Not in Arena Powered Cube: ${missingByReason['not_in_arena'].length}`);
  console.log(`  Low sample size (<500 games): ${missingByReason['low_sample'].length}`);

  if (missingByReason['not_in_arena'].length > 0) {
    console.log('\nCards not in Arena (will fall back to ELO):');
    for (const name of missingByReason['not_in_arena'].slice(0, 20)) {
      console.log(`  - ${name}`);
    }
    if (missingByReason['not_in_arena'].length > 20) {
      console.log(`  ... and ${missingByReason['not_in_arena'].length - 20} more`);
    }
  }

  // Color coverage summary
  console.log('\nColor-filtered IWD coverage:');
  const colorCoverage: Record<string, number> = {};
  for (const colors of COLOR_COMBOS) {
    let count = 0;
    for (const card of Object.values(result.cards)) {
      if (card.iwdByColor[colors]) count++;
    }
    colorCoverage[colors] = count;
    console.log(`  ${colors}: ${count} cards`);
  }

  // Write output file
  if (!dryRun) {
    const outputPath = path.join(__dirname, '../src/data/17lands-winrates.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nData written to: ${outputPath}`);

    const stats = fs.statSync(outputPath);
    console.log(`File size: ${Math.round(stats.size / 1024)} KB`);
  } else {
    console.log('\n[DRY RUN] Would write to src/data/17lands-winrates.json');
  }

  // Sample query result
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    SAMPLE DATA SHAPE');
  console.log('═══════════════════════════════════════════════════════════════');

  const sampleCards = ['Time Walk', 'Necromancy', 'Lightning Bolt', 'Sol Ring'];
  for (const name of sampleCards) {
    if (result.cards[name]) {
      console.log(`\n${name}:`);
      const card = result.cards[name];
      console.log(`  Global IWD: ${card.iwd !== null ? (card.iwd * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`  GIH WR: ${card.gihWR !== null ? (card.gihWR * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`  Avg Pick: ${card.avgPick !== null ? card.avgPick.toFixed(1) : 'N/A'}`);
      console.log(`  Games: ${card.gameCount.toLocaleString()}`);
      console.log(`  Color-filtered IWD:`);
      const colorEntries = Object.entries(card.iwdByColor).slice(0, 5);
      for (const [colors, data] of colorEntries) {
        console.log(`    ${colors}: ${data.iwd !== null ? (data.iwd * 100).toFixed(1) + '%' : 'N/A'} (${data.games} games)`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         DONE');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
