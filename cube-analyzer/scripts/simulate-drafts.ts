#!/usr/bin/env npx tsx
/**
 * Draft Simulation Script
 *
 * Simulates thousands of drafts using the rating system.
 * Analyzes resulting decks and extracts cube insights.
 *
 * Usage:
 *   npx tsx scripts/simulate-drafts.ts
 *   npx tsx scripts/simulate-drafts.ts --count 100 --seed 42
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import cubeData from '../src/data/cards.json';
import type { CubeCard } from '../src/types/card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { simulateMultipleDrafts } from './simulation/draft-engine';
import { analyzeDrafts } from './simulation/analyzer';
import { generateReport, displaySampleDecks } from './simulation/reporter';

// ============================================
// Configuration
// ============================================

interface Config {
  draftCount: number;
  seed?: number;
  showSamples: boolean;
  sampleCount: number;
  playerCount: number;
  outputSuffix: string;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    draftCount: 1000,
    seed: undefined,
    showSamples: true,
    sampleCount: 5,
    playerCount: 8,
    outputSuffix: '',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      config.draftCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      config.seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--players' && args[i + 1]) {
      config.playerCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.outputSuffix = args[i + 1];
      i++;
    } else if (args[i] === '--no-samples') {
      config.showSamples = false;
    } else if (args[i] === '--samples' && args[i + 1]) {
      config.sampleCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Draft Simulation Script

Usage:
  npx tsx scripts/simulate-drafts.ts [options]

Options:
  --count N       Number of drafts to simulate (default: 1000)
  --players N     Number of players per draft (default: 8)
  --seed N        Random seed for reproducibility
  --output NAME   Suffix for output files (e.g., "6p" -> simulation-data-6p.json)
  --no-samples    Don't display sample decks
  --samples N     Number of sample drafts to display (default: 5)
  --help          Show this help message

Examples:
  npx tsx scripts/simulate-drafts.ts --count 100
  npx tsx scripts/simulate-drafts.ts --count 1000 --players 6 --output 6p
  npx tsx scripts/simulate-drafts.ts --count 1000 --seed 42
`);
      process.exit(0);
    }
  }

  // Auto-generate output suffix if using non-standard player count
  if (config.playerCount !== 8 && !config.outputSuffix) {
    config.outputSuffix = `${config.playerCount}p`;
  }

  return config;
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    DRAFT SIMULATION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Load cube
  const cube = cubeData as CubeCard[];
  const cardsPerDraft = config.playerCount * 3 * 15; // players × packs × cards
  const undraftedCards = cube.length - cardsPerDraft;

  console.log(`Cube size: ${cube.length} cards`);
  console.log(`Drafts to simulate: ${config.draftCount}`);
  console.log(`Players per draft: ${config.playerCount}`);
  console.log(`Cards used per draft: ${cardsPerDraft} (${undraftedCards} undrafted)`);
  if (config.seed !== undefined) {
    console.log(`Seed: ${config.seed}`);
  }
  if (config.outputSuffix) {
    console.log(`Output suffix: ${config.outputSuffix}`);
  }
  console.log('');

  // Validate cube size
  if (cube.length < cardsPerDraft) {
    console.error(`❌ Error: Cube has ${cube.length} cards, need ${cardsPerDraft} for ${config.playerCount}-player draft.`);
    process.exit(1);
  }

  // Run simulation
  console.log('Running simulation...');
  const startTime = Date.now();

  const results = simulateMultipleDrafts(cube, config.draftCount, config.seed, {
    drafterCount: config.playerCount,
  });

  const draftTime = Date.now() - startTime;
  console.log(`  Draft simulation completed in ${(draftTime / 1000).toFixed(2)}s`);

  // Analyze results
  console.log('Analyzing results...');
  const analysisStart = Date.now();

  const analysis = analyzeDrafts(results, cube);

  const analysisTime = Date.now() - analysisStart;
  console.log(`  Analysis completed in ${(analysisTime / 1000).toFixed(2)}s`);

  // Show sample decks
  if (config.showSamples) {
    displaySampleDecks(results, config.sampleCount);
  }

  // Display summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  // Sanity checks
  console.log('\nSanity Checks:');
  const checks = analysis.sanityChecks;
  console.log(`  ✓ All decks 40 cards: ${checks.allDecks40Cards ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ All decks 17 lands: ${checks.allDecks17Lands ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ No duplicates in drafts: ${checks.noDuplicatesInDraft ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ All cards picked: ${checks.allCardsPickedAtLeastOnce ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Archetype diversity: ${checks.archetyesDiverse ? 'PASS' : 'FAIL'}`);

  // Archetype distribution
  console.log('\nArchetype Distribution:');
  const sortedArchetypes = Object.entries(analysis.archetypeDistribution)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [archId, stats] of sortedArchetypes) {
    const pct = ((stats.count / analysis.totalDecks) * 100).toFixed(1);
    console.log(`  ${archId.padEnd(12)} ${stats.count.toString().padStart(4)} decks (${pct.padStart(5)}%)`);
  }

  // Color balance
  console.log('\nColor Balance:');
  for (const color of ['W', 'U', 'B', 'R', 'G']) {
    const count = analysis.colorDistribution[color] || 0;
    const pct = ((count / analysis.totalDecks) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(parseFloat(pct) / 5));
    console.log(`  ${color}: ${bar} ${pct}%`);
  }

  // Anomalies
  if (analysis.colorImbalances.length > 0 || analysis.insufficientPoolCount > 0) {
    console.log('\nAnomalies:');
    for (const imbalance of analysis.colorImbalances) {
      console.log(`  ⚠️  ${imbalance}`);
    }
    if (analysis.insufficientPoolCount > 0) {
      const pct = ((analysis.insufficientPoolCount / analysis.totalDecks) * 100).toFixed(1);
      console.log(`  ⚠️  ${analysis.insufficientPoolCount} decks (${pct}%) had insufficient pool depth`);
    }
  }

  // Top cards
  console.log('\nTop 10 First Picks:');
  const topPicks = Object.entries(analysis.cardStats)
    .filter(([_, s]) => s.pickCount > 0)
    .sort((a, b) => a[1].avgPickPosition - b[1].avgPickPosition)
    .slice(0, 10);

  for (let i = 0; i < topPicks.length; i++) {
    const [name, stats] = topPicks[i];
    console.log(`  ${(i + 1).toString().padStart(2)}. ${name.padEnd(30)} (avg pick: ${stats.avgPickPosition})`);
  }

  // Generate reports
  generateReport(analysis, __dirname, {
    outputSuffix: config.outputSuffix,
    playerCount: config.playerCount,
  });

  // Final timing
  const totalTime = Date.now() - startTime;
  console.log('\n' + '═'.repeat(60));
  console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Drafts per second: ${(config.draftCount / (totalTime / 1000)).toFixed(1)}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
