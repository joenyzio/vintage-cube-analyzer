/**
 * Simulation Reporter
 *
 * Generates markdown and JSON reports from simulation analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AggregateAnalysis, DraftResult, BuiltDeck } from './types';

export interface ReportOptions {
  outputSuffix?: string;
  playerCount?: number;
}

// ============================================
// Report Generation
// ============================================

export function generateReport(
  analysis: AggregateAnalysis,
  outputDir: string,
  options?: ReportOptions
): void {
  const suffix = options?.outputSuffix ? `-${options.outputSuffix}` : '';
  const playerCount = options?.playerCount ?? 8;

  // Add metadata to analysis
  const analysisWithMeta = {
    ...analysis,
    playerCount,
    cardsPerDraft: playerCount * 3 * 15,
  };

  const markdown = generateMarkdownReport(analysisWithMeta, playerCount);
  const json = JSON.stringify(analysisWithMeta, null, 2);

  const mdFile = path.join(outputDir, `simulation-report${suffix}.md`);
  const jsonFile = path.join(outputDir, `simulation-data${suffix}.json`);

  // Write files
  fs.writeFileSync(mdFile, markdown);
  fs.writeFileSync(jsonFile, json);

  console.log(`\nReports written to:`);
  console.log(`  ${mdFile}`);
  console.log(`  ${jsonFile}`);
}

// ============================================
// Markdown Report
// ============================================

function generateMarkdownReport(analysis: AggregateAnalysis & { playerCount?: number; cardsPerDraft?: number }, playerCount: number): string {
  const lines: string[] = [];
  const cardsPerDraft = playerCount * 3 * 15;
  const undraftedCards = 360 - cardsPerDraft;

  lines.push('# Draft Simulation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**Players per Draft:** ${playerCount}`);
  lines.push(`**Drafts Simulated:** ${analysis.draftCount}`);
  lines.push(`**Total Decks Built:** ${analysis.totalDecks}`);
  if (undraftedCards > 0) {
    lines.push(`**Cards per Draft:** ${cardsPerDraft} (${undraftedCards} undrafted each time)`);
  }
  lines.push('');

  // Classification methodology note
  lines.push('## Classification Methodology');
  lines.push('');
  lines.push('Combo archetypes use **functional classification** - a deck must have both enablers AND payoffs:');
  lines.push('');
  lines.push('- **Storm**: Requires a payoff (Tendrils/Brain Freeze) + 3+ enablers (rituals, draw engines)');
  lines.push('- **Reanimator**: Requires reanimate spell + graveyard enabler + fatty target');
  lines.push('- **Sneak & Show**: Requires Sneak Attack/Show and Tell/Through the Breach + target');
  lines.push('- **Oath**: Requires Oath of Druids + creature payoff');
  lines.push('');
  lines.push('Fair archetypes (Midrange, Aggro, Control, Tempo, Ramp) are classified by card composition.');
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

  // Gap Analysis Section - Understanding Algorithm vs Reality
  lines.push('## Algorithm Gap Analysis');
  lines.push('');
  lines.push('The algorithm doesn\'t model competition between drafters. Each drafter optimizes');
  lines.push('for archetype fit independently. Real drafts have 8 drafters competing for limited');
  lines.push('cards in each archetype. This creates predictable gaps between simulation results');
  lines.push('and what the cube can actually support.');
  lines.push('');

  const archetypeEntries = Object.entries(analysis.archetypeDistribution)
    .sort((a, b) => b[1].count - a[1].count);
  const totalDecks = analysis.totalDecks;

  // Hardcoded cube composition (from actual card count analysis)
  // These represent the actual cards in the cube supporting each archetype
  const cubeComposition: Record<string, { cards: number; pct: number }> = {
    'artifacts': { cards: 46, pct: 23 },
    'control': { cards: 30, pct: 15 },
    'aggro': { cards: 27, pct: 13.5 },
    'midrange': { cards: 26, pct: 13 },
    'tempo': { cards: 21, pct: 10.5 },
    'reanimator': { cards: 17, pct: 8.5 },
    'ramp': { cards: 16, pct: 8 },
    'storm': { cards: 9, pct: 4.5 },
    'sneak': { cards: 7, pct: 3.5 },
    'oath': { cards: 1, pct: 0.5 },
  };

  lines.push('### Card Count vs Simulation Results');
  lines.push('');
  lines.push('| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |');
  lines.push('|-----------|---------------|------------|-----|----------------|');

  for (const [archId, stats] of archetypeEntries) {
    const simPct = (stats.count / totalDecks * 100);
    const cube = cubeComposition[archId];
    if (cube) {
      const gap = simPct - cube.pct;
      const gapStr = gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`;
      let interpretation = '';
      if (gap > 5) {
        interpretation = 'Algorithm over-commits; heavily contested in real drafts';
      } else if (gap < -5) {
        interpretation = 'Algorithm under-values; likely open in real drafts';
      } else {
        interpretation = 'Roughly matches card support';
      }
      lines.push(`| ${archId} | ${cube.cards} (${cube.pct}%) | ${simPct.toFixed(1)}% | ${gapStr} | ${interpretation} |`);
    }
  }
  lines.push('');

  // Combo over-representation
  lines.push('### Combo Over-Representation');
  lines.push('');
  lines.push('The algorithm pushes drafters toward combo archetypes whose card pools can\'t');
  lines.push('support that many drafters:');
  lines.push('');
  const comboArchetypes = ['storm', 'reanimator', 'sneak'];
  for (const arch of comboArchetypes) {
    const stats = analysis.archetypeDistribution[arch];
    const cube = cubeComposition[arch];
    if (stats && cube) {
      const simPct = (stats.count / totalDecks * 100).toFixed(1);
      lines.push(`- **${arch}**: ${cube.cards} cards → ${simPct}% of decks (only 1-2 drafters can realistically build this)`);
    }
  }
  lines.push('');

  // Linear under-representation
  lines.push('### Linear Under-Representation');
  lines.push('');
  lines.push('The algorithm scatters these cards across other strategies as "value picks"');
  lines.push('rather than recognizing them as coherent archetypes:');
  lines.push('');
  const linearArchetypes = ['artifacts', 'aggro', 'tempo', 'control'];
  for (const arch of linearArchetypes) {
    const stats = analysis.archetypeDistribution[arch];
    const cube = cubeComposition[arch];
    if (stats && cube) {
      const simPct = (stats.count / totalDecks * 100).toFixed(1);
      lines.push(`- **${arch}**: ${cube.cards} cards → ${simPct}% of decks (structurally deep, likely open)`);
    }
  }
  lines.push('');

  // Drafting Implications
  lines.push('## Drafting Implications');
  lines.push('');
  lines.push('For real drafts of this cube, use this gap analysis:');
  lines.push('');
  lines.push('**Heavily Contested (proceed with caution):**');
  lines.push('- Storm has only 9 cards — if you see others taking rituals, bail out');
  lines.push('- Reanimator has 17 cards — can support 1-2 drafters maximum');
  lines.push('- Sneak/Show has 7 cards — commit hard early or stay away entirely');
  lines.push('');
  lines.push('**Likely Open (look for signals):**');
  lines.push('- Artifacts is the deepest archetype (46 cards) but rarely drafted as a deck');
  lines.push('- Aggro is structurally supported (27 cards) but routinely underdrafted');
  lines.push('- Tempo has real support (21 cards) that gets scattered across other decks');
  lines.push('');
  lines.push('**The Key Insight:**');
  lines.push('');
  lines.push('The algorithm tells you what optimal independent drafting looks like.');
  lines.push('The cube tells you what\'s actually supported.');
  lines.push('The gap tells you where the value is.');
  lines.push('');

  // Color Balance (keep this section)
  lines.push('## Color Balance');
  lines.push('');
  const colorPcts: Record<string, number> = {};
  for (const color of ['W', 'U', 'B', 'R', 'G']) {
    colorPcts[color] = ((analysis.colorDistribution[color] || 0) / totalDecks) * 100;
  }
  const avgColorPct = Object.values(colorPcts).reduce((a, b) => a + b, 0) / 5;
  lines.push(`Average color appearance: ${avgColorPct.toFixed(1)}%`);
  lines.push('');
  for (const color of ['W', 'U', 'B', 'R', 'G']) {
    const colorName = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }[color];
    const pct = colorPcts[color];
    const delta = pct - avgColorPct;
    const deltaStr = delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
    lines.push(`- ${colorName}: ${pct.toFixed(1)}% (${deltaStr} from average)`);
  }
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **${analysis.draftCount}** drafts simulated, **${totalDecks}** decks built`);
  lines.push(`- Top archetype by algorithm: **${archetypeEntries[0][0]}** (${(archetypeEntries[0][1].count / totalDecks * 100).toFixed(1)}%)`);
  lines.push(`- Most played color: **${Object.entries(colorPcts).sort((a, b) => b[1] - a[1])[0][0]}** (${Object.entries(colorPcts).sort((a, b) => b[1] - a[1])[0][1].toFixed(1)}%)`);
  lines.push(`- Avg deck quality: **${analysis.deckProfiles.deckQuality.mean.toFixed(0)}** ELO`);
  lines.push('');

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
