#!/usr/bin/env npx tsx
/**
 * Deck Analysis Simulation Script
 *
 * Extends draft simulation to analyze final deck quality,
 * compare draft picks vs deck building, and surface patterns.
 *
 * Usage:
 *   npx tsx scripts/simulate-deck-analysis.ts
 *   npx tsx scripts/simulate-deck-analysis.ts --count 1000 --seed 42
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import cubeData from '../src/data/cards.json';
import type { CubeCard } from '../src/types/card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { simulateMultipleDrafts } from './simulation/draft-engine';
import { analyzeDrafts } from './simulation/analyzer';
import {
  compareDraftVsDeck,
  aggregateDeckAnalysis,
  type DraftVsDeckComparison,
  type AggregatedDeckAnalysis,
} from './simulation/deck-analysis';

// ============================================
// Configuration
// ============================================

interface Config {
  draftCount: number;
  seed?: number;
  showSamples: boolean;
  sampleCount: number;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    draftCount: 1000,
    seed: undefined,
    showSamples: true,
    sampleCount: 10,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      config.draftCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      config.seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--no-samples') {
      config.showSamples = false;
    } else if (args[i] === '--samples' && args[i + 1]) {
      config.sampleCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Deck Analysis Simulation Script

Usage:
  npx tsx scripts/simulate-deck-analysis.ts [options]

Options:
  --count N       Number of drafts to simulate (default: 1000)
  --seed N        Random seed for reproducibility
  --no-samples    Don't display sample decks
  --samples N     Number of sample decks to display (default: 10)
  --help          Show this help message

Examples:
  npx tsx scripts/simulate-deck-analysis.ts --count 500
  npx tsx scripts/simulate-deck-analysis.ts --count 1000 --seed 42
`);
      process.exit(0);
    }
  }

  return config;
}

// ============================================
// Report Generation
// ============================================

function generateDeckAnalysisReport(
  analysis: AggregatedDeckAnalysis,
  comparisons: DraftVsDeckComparison[]
): string {
  const lines: string[] = [];

  lines.push('# Deck Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Decks Analyzed: ${analysis.totalDecks}`);
  lines.push('');

  // Summary stats
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Average Deck Quality | ${analysis.avgDeckQuality}/100 |`);
  lines.push(`| Average Pool Power | ${analysis.avgPoolPower} ELO |`);
  lines.push(`| Average Power Utilization | ${analysis.avgPowerUtilization}% |`);
  lines.push(`| Average Draft→Deck Delta | ${analysis.avgQualityDelta > 0 ? '+' : ''}${analysis.avgQualityDelta} |`);
  lines.push(`| Built Well (delta > +10) | ${analysis.builtWellCount} (${Math.round(analysis.builtWellCount / analysis.totalDecks * 100)}%) |`);
  lines.push(`| Built Poorly (delta < -10) | ${analysis.builtPoorlyCount} (${Math.round(analysis.builtPoorlyCount / analysis.totalDecks * 100)}%) |`);
  lines.push('');

  // Archetype breakdown
  lines.push('## Archetype Analysis');
  lines.push('');
  lines.push('| Archetype | Decks | Avg Quality | Avg Delta | Power Util |');
  lines.push('|-----------|-------|-------------|-----------|------------|');

  const sortedArchetypes = Object.entries(analysis.archetypeBreakdown)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [arch, data] of sortedArchetypes) {
    const deltaStr = data.avgQualityDelta > 0 ? `+${data.avgQualityDelta}` : `${data.avgQualityDelta}`;
    lines.push(`| ${arch} | ${data.count} | ${data.avgDeckQuality}/100 | ${deltaStr} | ${data.avgPowerUtilization}% |`);
  }
  lines.push('');

  // Interpretation
  lines.push('### Interpretation');
  lines.push('');
  lines.push('- **High Power Utilization** = most of what you draft makes your deck');
  lines.push('- **Positive Delta** = deck building added value beyond what you drafted');
  lines.push('- **Negative Delta** = drafted well but assembled poorly (wrong colors, bad cuts)');
  lines.push('');

  // Card Patterns
  lines.push('## Card Patterns');
  lines.push('');

  // Frequently cut cards
  if (analysis.frequentCuts.length > 0) {
    lines.push('### Cards Often Cut (Drafted but Sideboarded)');
    lines.push('');
    lines.push('| Card | Avg ELO | Avg Pick | Cut Rate | Reason |');
    lines.push('|------|---------|----------|----------|--------|');

    for (const card of analysis.frequentCuts.slice(0, 15)) {
      lines.push(`| ${card.cardName} | ${card.avgElo} | #${card.avgPickPosition} | ${card.cutRate}% | ${card.primaryCutReason} |`);
    }
    lines.push('');
  }

  // Frequently included
  if (analysis.frequentInclusions.length > 0) {
    lines.push('### Cards Rarely Cut (High Inclusion Rate)');
    lines.push('');
    lines.push('| Card | Avg ELO | Avg Pick | Inclusion Rate | Top Archetypes |');
    lines.push('|------|---------|----------|----------------|----------------|');

    for (const card of analysis.frequentInclusions.slice(0, 15)) {
      lines.push(`| ${card.cardName} | ${card.avgElo} | #${card.avgPickPosition} | ${card.inclusionRate}% | ${card.primaryArchetypes.join(', ')} |`);
    }
    lines.push('');
  }

  // Surprising inclusions (low ELO but high inclusion)
  if (analysis.surprisingInclusions.length > 0) {
    lines.push('### Underrated Cards (Low ELO, High Inclusion)');
    lines.push('');
    lines.push('These cards have low ELO ratings but frequently make main decks.');
    lines.push('');
    lines.push('| Card | Avg ELO | Inclusion Rate | Top Archetypes |');
    lines.push('|------|---------|----------------|----------------|');

    for (const card of analysis.surprisingInclusions.slice(0, 10)) {
      lines.push(`| ${card.cardName} | ${card.avgElo} | ${card.inclusionRate}% | ${card.primaryArchetypes.join(', ')} |`);
    }
    lines.push('');
  }

  // Surprising cuts (high ELO but often cut)
  if (analysis.surprisingCuts.length > 0) {
    lines.push('### Overrated Cards (High ELO, Often Cut)');
    lines.push('');
    lines.push('These cards have high ELO ratings but frequently get sideboarded.');
    lines.push('');
    lines.push('| Card | Avg ELO | Cut Rate | Reason |');
    lines.push('|------|---------|----------|--------|');

    for (const card of analysis.surprisingCuts.slice(0, 10)) {
      lines.push(`| ${card.cardName} | ${card.avgElo} | ${card.cutRate}% | ${card.primaryCutReason} |`);
    }
    lines.push('');
  }

  // Outliers
  if (analysis.outliers.length > 0) {
    lines.push('## Interesting Outliers');
    lines.push('');

    for (const outlier of analysis.outliers) {
      lines.push(`### ${outlier.type.replace(/_/g, ' ').toUpperCase()}`);
      lines.push('');
      lines.push(`**Drafter ${outlier.drafterId + 1}** (seed: ${outlier.seed})`);
      lines.push('');
      lines.push(outlier.description);
      lines.push('');
      if (outlier.details.draftQuality !== undefined) {
        lines.push(`- Draft Quality: ${outlier.details.draftQuality}`);
      }
      if (outlier.details.deckQuality !== undefined) {
        lines.push(`- Deck Quality: ${outlier.details.deckQuality}/100`);
      }
      if (outlier.details.delta !== undefined) {
        lines.push(`- Delta: ${outlier.details.delta > 0 ? '+' : ''}${outlier.details.delta}`);
      }
      lines.push('');
    }
  }

  // Key insights
  lines.push('## Key Insights');
  lines.push('');
  lines.push('1. **Pool-to-Deck Gap**: Average decks use ' + analysis.avgPowerUtilization + '% of their drafted power.');
  lines.push('   The rest sits in the sideboard (off-color, wrong curve, too expensive).');
  lines.push('');
  lines.push('2. **Building Matters**: ' + Math.round((analysis.builtWellCount + analysis.builtPoorlyCount) / analysis.totalDecks * 100) + '% of decks');
  lines.push('   show meaningful delta between draft quality and deck quality.');
  lines.push('');

  // Find archetype with highest delta
  const bestBuildArch = sortedArchetypes.find(([_, d]) => d.avgQualityDelta > 5);
  const worstBuildArch = sortedArchetypes.find(([_, d]) => d.avgQualityDelta < -5);

  if (bestBuildArch) {
    lines.push(`3. **${bestBuildArch[0]}** tends to build well (+${bestBuildArch[1].avgQualityDelta} delta),`);
    lines.push('   suggesting synergies come together during deck building.');
    lines.push('');
  }

  if (worstBuildArch) {
    lines.push(`4. **${worstBuildArch[0]}** tends to build poorly (${worstBuildArch[1].avgQualityDelta} delta),`);
    lines.push('   suggesting it\'s harder to assemble a coherent deck in this archetype.');
    lines.push('');
  }

  return lines.join('\n');
}

function displaySampleDecks(
  comparisons: DraftVsDeckComparison[],
  results: any[],
  count: number
): void {
  console.log('\n' + '═'.repeat(60));
  console.log('SAMPLE DECK ANALYSES');
  console.log('═'.repeat(60));

  // Sort by delta to show interesting cases
  const sorted = [...comparisons].sort((a, b) => Math.abs(b.qualityDelta) - Math.abs(a.qualityDelta));

  for (let i = 0; i < Math.min(count, sorted.length); i++) {
    const comp = sorted[i];
    const draftIndex = Math.floor(comparisons.indexOf(comp) / 8);
    const deck = results[draftIndex]?.decks?.find((d: any) => d.drafterId === comp.drafterId);

    console.log(`\n--- Drafter ${comp.drafterId + 1} (${comp.interpretation}) ---`);
    console.log(`Archetype: ${deck?.finalArchetype || 'unknown'}`);
    console.log(`Colors: ${deck?.colors?.join('') || 'colorless'}`);
    console.log('');
    console.log(`Draft Quality: ${comp.draftQuality} (avg pick ELO: ${comp.avgPickElo})`);
    console.log(`Deck Quality:  ${comp.deckQuality.overallScore}/100`);
    console.log(`Delta:         ${comp.qualityDelta > 0 ? '+' : ''}${comp.qualityDelta}`);
    console.log('');
    console.log('Quality Breakdown:');
    console.log(`  Power Level:      ${comp.deckQuality.avgCardElo} avg ELO`);
    console.log(`  Archetype:        ${comp.deckQuality.archetypeCoherence}/100`);
    console.log(`  Mana Base:        ${comp.deckQuality.manaBaseQuality}/100`);
    console.log(`  Curve:            ${comp.deckQuality.curveQuality}/100`);
    console.log(`  Win Conditions:   ${comp.deckQuality.winConditionPresence}/100`);
    console.log(`  Card Advantage:   ${comp.deckQuality.cardAdvantageEngines}/100`);
    console.log(`  Removal:          ${comp.deckQuality.removalPackage}/100`);
    console.log('');
    console.log('Pool Analysis:');
    console.log(`  Pool Power:       ${comp.poolAnalysis.poolPowerLevel} total ELO`);
    console.log(`  Power Utilized:   ${comp.poolAnalysis.powerUtilization}%`);
    console.log(`  ELO in Sideboard: ${comp.poolAnalysis.eloWastedInSideboard}`);

    if (comp.poolAnalysis.highEloCuts.length > 0) {
      console.log('');
      console.log('High ELO Cuts:');
      for (const cut of comp.poolAnalysis.highEloCuts.slice(0, 3)) {
        console.log(`  - ${cut.name} (${cut.elo} ELO, pick #${cut.pickPosition})`);
      }
    }

    if (comp.poolAnalysis.lowEloInclusions.length > 0) {
      console.log('');
      console.log('Low ELO Inclusions:');
      for (const inc of comp.poolAnalysis.lowEloInclusions.slice(0, 3)) {
        console.log(`  + ${inc.name} (${inc.elo} ELO, pick #${inc.pickPosition})`);
      }
    }

    console.log('');
    console.log(`Curve: [${comp.deckQuality.curveDistribution.join(', ')}]`);
  }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  DECK ANALYSIS SIMULATION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Load cube
  const cube = cubeData as CubeCard[];
  console.log(`Cube size: ${cube.length} cards`);
  console.log(`Drafts to simulate: ${config.draftCount}`);
  if (config.seed !== undefined) {
    console.log(`Seed: ${config.seed}`);
  }
  console.log('');

  // Run simulation
  console.log('Running draft simulation...');
  const startTime = Date.now();

  const results = simulateMultipleDrafts(cube, config.draftCount, config.seed);

  const draftTime = Date.now() - startTime;
  console.log(`  Draft simulation completed in ${(draftTime / 1000).toFixed(2)}s`);

  // Run deck analysis
  console.log('Analyzing decks...');
  const analysisStart = Date.now();

  const comparisons: DraftVsDeckComparison[] = [];

  for (let d = 0; d < results.length; d++) {
    const draft = results[d];
    for (let i = 0; i < 8; i++) {
      const deck = draft.decks[i];
      const pool = deck.mainDeck.concat(deck.sideboard);

      const comparison = compareDraftVsDeck(
        deck,
        pool,
        draft.pickLog,
        deck.drafterId
      );
      comparisons.push(comparison);
    }

    if ((d + 1) % 100 === 0) {
      console.log(`  Analyzed ${d + 1}/${results.length} drafts...`);
    }
  }

  const aggregated = aggregateDeckAnalysis(results, comparisons);

  const analysisTime = Date.now() - analysisStart;
  console.log(`  Deck analysis completed in ${(analysisTime / 1000).toFixed(2)}s`);

  // Display samples
  if (config.showSamples) {
    displaySampleDecks(comparisons, results, config.sampleCount);
  }

  // Display summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  console.log('\nQuality Metrics:');
  console.log(`  Avg Deck Quality:     ${aggregated.avgDeckQuality}/100`);
  console.log(`  Avg Pool Power:       ${aggregated.avgPoolPower} ELO`);
  console.log(`  Avg Power Utilization: ${aggregated.avgPowerUtilization}%`);
  console.log(`  Avg Draft→Deck Delta: ${aggregated.avgQualityDelta > 0 ? '+' : ''}${aggregated.avgQualityDelta}`);

  console.log('\nBuild Quality:');
  console.log(`  Built Well:   ${aggregated.builtWellCount} (${Math.round(aggregated.builtWellCount / aggregated.totalDecks * 100)}%)`);
  console.log(`  Built Poorly: ${aggregated.builtPoorlyCount} (${Math.round(aggregated.builtPoorlyCount / aggregated.totalDecks * 100)}%)`);
  console.log(`  Neutral:      ${aggregated.totalDecks - aggregated.builtWellCount - aggregated.builtPoorlyCount} (${Math.round((aggregated.totalDecks - aggregated.builtWellCount - aggregated.builtPoorlyCount) / aggregated.totalDecks * 100)}%)`);

  console.log('\nArchetype Quality:');
  const sortedArch = Object.entries(aggregated.archetypeBreakdown)
    .sort((a, b) => b[1].avgDeckQuality - a[1].avgDeckQuality);
  for (const [arch, data] of sortedArch.slice(0, 5)) {
    const delta = data.avgQualityDelta > 0 ? `+${data.avgQualityDelta}` : `${data.avgQualityDelta}`;
    console.log(`  ${arch.padEnd(12)} ${data.avgDeckQuality}/100 (delta: ${delta.padStart(3)}, util: ${data.avgPowerUtilization}%)`);
  }

  console.log('\nCards Often Cut:');
  for (const card of aggregated.frequentCuts.slice(0, 5)) {
    console.log(`  ${card.cardName.padEnd(30)} ${card.cutRate}% cut (${card.avgElo} ELO)`);
  }

  console.log('\nCards Rarely Cut:');
  for (const card of aggregated.frequentInclusions.slice(0, 5)) {
    console.log(`  ${card.cardName.padEnd(30)} ${card.inclusionRate}% included (${card.avgElo} ELO)`);
  }

  // Generate reports
  const report = generateDeckAnalysisReport(aggregated, comparisons);
  const reportPath = path.join(__dirname, 'deck-analysis-report.md');
  fs.writeFileSync(reportPath, report);

  const jsonPath = path.join(__dirname, 'deck-analysis-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalDecks: aggregated.totalDecks,
    summary: {
      avgDeckQuality: aggregated.avgDeckQuality,
      avgPoolPower: aggregated.avgPoolPower,
      avgPowerUtilization: aggregated.avgPowerUtilization,
      avgQualityDelta: aggregated.avgQualityDelta,
      builtWellCount: aggregated.builtWellCount,
      builtPoorlyCount: aggregated.builtPoorlyCount,
    },
    archetypeBreakdown: aggregated.archetypeBreakdown,
    cardPatterns: {
      frequentCuts: aggregated.frequentCuts,
      frequentInclusions: aggregated.frequentInclusions,
      surprisingInclusions: aggregated.surprisingInclusions,
      surprisingCuts: aggregated.surprisingCuts,
    },
    outliers: aggregated.outliers,
  }, null, 2));

  console.log(`\nReports written to:`);
  console.log(`  ${reportPath}`);
  console.log(`  ${jsonPath}`);

  // Final timing
  const totalTime = Date.now() - startTime;
  console.log('\n' + '═'.repeat(60));
  console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Decks analyzed per second: ${(aggregated.totalDecks / (totalTime / 1000)).toFixed(1)}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
