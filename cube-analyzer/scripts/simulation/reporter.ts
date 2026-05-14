/**
 * Simulation Reporter
 *
 * Generates markdown and JSON reports from simulation analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AggregateAnalysis, DraftResult, BuiltDeck } from './types';

// ============================================
// Report Generation
// ============================================

export function generateReport(
  analysis: AggregateAnalysis,
  outputDir: string
): void {
  const markdown = generateMarkdownReport(analysis);
  const json = JSON.stringify(analysis, null, 2);

  // Write files
  fs.writeFileSync(path.join(outputDir, 'simulation-report.md'), markdown);
  fs.writeFileSync(path.join(outputDir, 'simulation-data.json'), json);

  console.log(`\nReports written to:`);
  console.log(`  ${path.join(outputDir, 'simulation-report.md')}`);
  console.log(`  ${path.join(outputDir, 'simulation-data.json')}`);
}

// ============================================
// Markdown Report
// ============================================

function generateMarkdownReport(analysis: AggregateAnalysis): string {
  const lines: string[] = [];

  lines.push('# Draft Simulation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**Drafts Simulated:** ${analysis.draftCount}`);
  lines.push(`**Total Decks Built:** ${analysis.totalDecks}`);
  lines.push('');

  // Sanity Checks
  lines.push('## Sanity Checks');
  lines.push('');
  lines.push('| Check | Result |');
  lines.push('|-------|--------|');
  lines.push(`| All decks 40 cards | ${analysis.sanityChecks.allDecks40Cards ? '✓' : '✗'} |`);
  lines.push(`| All decks 17 lands | ${analysis.sanityChecks.allDecks17Lands ? '✓' : '✗'} |`);
  lines.push(`| No duplicates in draft | ${analysis.sanityChecks.noDuplicatesInDraft ? '✓' : '✗'} |`);
  lines.push(`| All cards picked at least once | ${analysis.sanityChecks.allCardsPickedAtLeastOnce ? '✓' : '✗'} |`);
  lines.push(`| Archetype diversity (5+ above 1%) | ${analysis.sanityChecks.archetyesDiverse ? '✓' : '✗'} |`);
  lines.push('');

  // Archetype Distribution
  lines.push('## Archetype Distribution');
  lines.push('');
  lines.push('| Archetype | Decks | % | Avg Commitment | Avg Deck Quality |');
  lines.push('|-----------|-------|---|----------------|------------------|');

  const sortedArchetypes = Object.entries(analysis.archetypeDistribution)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [archId, stats] of sortedArchetypes) {
    const pct = ((stats.count / analysis.totalDecks) * 100).toFixed(1);
    lines.push(`| ${archId} | ${stats.count} | ${pct}% | ${stats.avgCommitment.toFixed(2)} | ${stats.avgDeckQuality} |`);
  }
  lines.push('');

  // Color Distribution
  lines.push('## Color Distribution');
  lines.push('');
  lines.push('### Single Colors');
  lines.push('');
  lines.push('| Color | Appearances | % of Decks |');
  lines.push('|-------|-------------|------------|');

  for (const color of ['W', 'U', 'B', 'R', 'G']) {
    const count = analysis.colorDistribution[color] || 0;
    const pct = ((count / analysis.totalDecks) * 100).toFixed(1);
    const colorName = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }[color];
    lines.push(`| ${colorName} (${color}) | ${count} | ${pct}% |`);
  }
  lines.push('');

  // Color Pairs
  lines.push('### Color Combinations');
  lines.push('');
  lines.push('| Colors | Count | % |');
  lines.push('|--------|-------|---|');

  const sortedPairs = Object.entries(analysis.colorPairDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  for (const [colors, count] of sortedPairs) {
    const pct = ((count / analysis.totalDecks) * 100).toFixed(1);
    lines.push(`| ${colors || 'Colorless'} | ${count} | ${pct}% |`);
  }
  lines.push('');

  // Deck Profiles
  lines.push('## Average Deck Profile');
  lines.push('');
  lines.push('| Metric | Mean | Std Dev | Min | Max |');
  lines.push('|--------|------|---------|-----|-----|');
  lines.push(`| Creatures | ${analysis.deckProfiles.creatures.mean} | ${analysis.deckProfiles.creatures.stdDev} | ${analysis.deckProfiles.creatures.min} | ${analysis.deckProfiles.creatures.max} |`);
  lines.push(`| Removal | ${analysis.deckProfiles.removal.mean} | ${analysis.deckProfiles.removal.stdDev} | ${analysis.deckProfiles.removal.min} | ${analysis.deckProfiles.removal.max} |`);
  lines.push(`| Card Draw | ${analysis.deckProfiles.cardDraw.mean} | ${analysis.deckProfiles.cardDraw.stdDev} | ${analysis.deckProfiles.cardDraw.min} | ${analysis.deckProfiles.cardDraw.max} |`);
  lines.push(`| Avg CMC | ${analysis.deckProfiles.avgCmc.mean} | ${analysis.deckProfiles.avgCmc.stdDev} | ${analysis.deckProfiles.avgCmc.min} | ${analysis.deckProfiles.avgCmc.max} |`);
  lines.push(`| Deck Quality | ${analysis.deckProfiles.deckQuality.mean} | ${analysis.deckProfiles.deckQuality.stdDev} | ${analysis.deckProfiles.deckQuality.min} | ${analysis.deckProfiles.deckQuality.max} |`);
  lines.push('');

  // Top Picked Cards
  lines.push('## Most Picked Cards');
  lines.push('');
  lines.push('### First Picks (P1P1)');
  lines.push('');

  const cardsByEarlyPick = Object.entries(analysis.cardStats)
    .filter(([_, s]) => s.pickCount > 0)
    .sort((a, b) => a[1].avgPickPosition - b[1].avgPickPosition)
    .slice(0, 20);

  lines.push('| Rank | Card | Avg Pick Position | Times Picked |');
  lines.push('|------|------|-------------------|--------------|');

  let rank = 1;
  for (const [name, stats] of cardsByEarlyPick) {
    lines.push(`| ${rank} | ${name} | ${stats.avgPickPosition} | ${stats.pickCount} |`);
    rank++;
  }
  lines.push('');

  // Wheel Analysis
  lines.push('## Wheel Analysis');
  lines.push('');

  if (analysis.consistentWheelers.length > 0) {
    lines.push('### Consistent Wheelers (wheel > 80% of opportunities)');
    lines.push('');
    lines.push('| Card | Wheel Rate | Opportunities |');
    lines.push('|------|------------|---------------|');

    for (const name of analysis.consistentWheelers.slice(0, 15)) {
      const stats = analysis.cardStats[name];
      const rate = ((stats.wheelCount / stats.wheelOpportunities) * 100).toFixed(1);
      lines.push(`| ${name} | ${rate}% | ${stats.wheelOpportunities} |`);
    }
    lines.push('');
  }

  if (analysis.neverWheelers.length > 0) {
    lines.push('### Never Wheelers (wheel < 5% of opportunities)');
    lines.push('');
    lines.push('| Card | Avg Pick Position |');
    lines.push('|------|-------------------|');

    for (const name of analysis.neverWheelers.slice(0, 15)) {
      const stats = analysis.cardStats[name];
      lines.push(`| ${name} | ${stats.avgPickPosition} |`);
    }
    lines.push('');
  }

  // Sideboard Analysis
  if (analysis.consistentSideboards.length > 0) {
    lines.push('## Sideboard Analysis');
    lines.push('');
    lines.push('### Cards Often Sideboarded (> 50% of picks)');
    lines.push('');
    lines.push('| Card | Sideboard Rate | Times Picked |');
    lines.push('|------|----------------|--------------|');

    for (const name of analysis.consistentSideboards.slice(0, 15)) {
      const stats = analysis.cardStats[name];
      const rate = ((stats.sideboardCount / stats.pickCount) * 100).toFixed(1);
      lines.push(`| ${name} | ${rate}% | ${stats.pickCount} |`);
    }
    lines.push('');
  }

  // Anomalies
  lines.push('## Anomalies');
  lines.push('');

  if (analysis.colorImbalances.length > 0) {
    lines.push('### Color Imbalances');
    lines.push('');
    for (const imbalance of analysis.colorImbalances) {
      lines.push(`- ${imbalance}`);
    }
    lines.push('');
  }

  if (analysis.insufficientPoolCount > 0) {
    lines.push(`### Insufficient Pool Depth: ${analysis.insufficientPoolCount} decks`);
    lines.push('');
    lines.push(`${((analysis.insufficientPoolCount / analysis.totalDecks) * 100).toFixed(1)}% of decks had fewer than 23 castable non-land cards in their chosen colors.`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// Sample Deck Display
// ============================================

export function displaySampleDecks(results: DraftResult[], count: number): void {
  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE DECKS');
  console.log('='.repeat(60));

  const sampled = results.slice(0, Math.min(count, results.length));

  for (let i = 0; i < sampled.length; i++) {
    const draft = sampled[i];
    console.log(`\n--- Draft ${i + 1} (seed: ${draft.seed}) ---`);

    for (const deck of draft.decks.slice(0, 2)) {  // Show 2 decks per draft
      displayDeck(deck);
    }
  }
}

function displayDeck(deck: BuiltDeck): void {
  console.log(`\nDrafter ${deck.drafterId + 1}:`);
  console.log(`  Colors: ${deck.colors.join('') || 'Colorless'}`);
  console.log(`  Archetype: ${deck.finalArchetype || 'None'} (${(deck.archetypeCommitment * 100).toFixed(0)}% commitment)`);
  console.log(`  Quality: ${deck.deckQuality}`);
  console.log(`  Creatures: ${deck.creatureCount}, Removal: ${deck.removalCount}, Draw: ${deck.cardDrawCount}`);
  console.log(`  Avg CMC: ${deck.avgCmc}`);
  console.log(`  Lands: ${deck.draftedLandsUsed} drafted + ${deck.basicsAdded} basics`);

  if (deck.insufficientPoolDepth) {
    console.log(`  ⚠️  Insufficient pool depth`);
  }

  // Show main deck non-lands
  const nonLands = deck.mainDeck.filter(c => !c.type_line?.toLowerCase().includes('land'));
  console.log(`  Main deck (${nonLands.length} spells):`);

  // Group by CMC
  const byCmc: Record<number, string[]> = {};
  for (const card of nonLands) {
    const cmc = card.cmc || 0;
    if (!byCmc[cmc]) byCmc[cmc] = [];
    byCmc[cmc].push(card.name);
  }

  for (const cmc of Object.keys(byCmc).map(Number).sort((a, b) => a - b)) {
    console.log(`    ${cmc}cmc: ${byCmc[cmc].join(', ')}`);
  }
}
