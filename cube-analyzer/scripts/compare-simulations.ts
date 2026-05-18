/**
 * Simulation Comparison: Baseline vs IWD-Informed
 *
 * Analyzes the differences between ELO-only and IWD-informed bot behavior.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getCardSignal } from '../src/services/simulationInsights';
import { getEloData } from '../src/services/eloHelpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both datasets
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'simulation-data-baseline.json'), 'utf-8'));
const iwd = JSON.parse(fs.readFileSync(path.join(__dirname, 'simulation-data-iwd.json'), 'utf-8'));

interface ArchetypeStats {
  count: number;
  avgCommitment: number;
  avgDeckQuality: number;
}

interface CardStats {
  pickCount: number;
  totalAppearances: number;
  avgPickPosition: number;
  wheelCount: number;
  wheelOpportunities: number;
  archetypeBreakdown: Record<string, number>;
  sideboardCount: number;
}

// ============================================================================
// COMPARISON ANALYSIS
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('        IWD-INFORMED SIMULATION COMPARISON');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Baseline: ${baseline.draftCount} drafts, ${baseline.totalDecks} decks (ELO + affinity)`);
console.log(`IWD:      ${iwd.draftCount} drafts, ${iwd.totalDecks} decks (ELO + affinity + IWD signals)`);
console.log('');

// ============================================================================
// 1. ARCHETYPE EMERGENCE
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('1. ARCHETYPE EMERGENCE');
console.log('═══════════════════════════════════════════════════════════════\n');

const archetypes = Object.keys(baseline.archetypeDistribution);
const archetypeComparison: { name: string; baselinePct: number; iwdPct: number; delta: number; baseQual: number; iwdQual: number; qualDelta: number }[] = [];

archetypes.forEach(arch => {
  const b = baseline.archetypeDistribution[arch] as ArchetypeStats;
  const i = iwd.archetypeDistribution[arch] as ArchetypeStats;

  const baselinePct = (b.count / baseline.totalDecks) * 100;
  const iwdPct = (i.count / iwd.totalDecks) * 100;

  archetypeComparison.push({
    name: arch,
    baselinePct,
    iwdPct,
    delta: iwdPct - baselinePct,
    baseQual: b.avgDeckQuality,
    iwdQual: i.avgDeckQuality,
    qualDelta: i.avgDeckQuality - b.avgDeckQuality,
  });
});

// Sort by delta (biggest changes first)
archetypeComparison.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log('Archetype          Base%   IWD%   Δ%     Base Quality  IWD Quality  Δ Quality');
console.log('─────────────────────────────────────────────────────────────────────────────');
archetypeComparison.forEach(a => {
  const deltaSign = a.delta >= 0 ? '+' : '';
  const qualDeltaSign = a.qualDelta >= 0 ? '+' : '';
  console.log(
    `${a.name.padEnd(16)} ${a.baselinePct.toFixed(1).padStart(5)}%  ${a.iwdPct.toFixed(1).padStart(5)}%  ${deltaSign}${a.delta.toFixed(2).padStart(5)}   ` +
    `${a.baseQual.toFixed(0).padStart(10)}   ${a.iwdQual.toFixed(0).padStart(10)}   ${qualDeltaSign}${a.qualDelta.toFixed(0)}`
  );
});

// ============================================================================
// 2. CARD PICK PATTERNS
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('2. CARD PICK PATTERNS');
console.log('═══════════════════════════════════════════════════════════════\n');

const baselineCards = baseline.cardStats as Record<string, CardStats>;
const iwdCards = iwd.cardStats as Record<string, CardStats>;

// Calculate pick position changes
const pickChanges: { name: string; basePos: number; iwdPos: number; delta: number; signal: string }[] = [];

Object.keys(baselineCards).forEach(cardName => {
  const b = baselineCards[cardName];
  const i = iwdCards[cardName];

  if (!b || !i) return;
  if (b.totalAppearances < 100 || i.totalAppearances < 100) return; // Filter noise

  const signal = getCardSignal(cardName, []);
  const signalStr = signal.divergence
    ? signal.divergence.direction.toUpperCase()
    : signal.confidence;

  pickChanges.push({
    name: cardName,
    basePos: b.avgPickPosition,
    iwdPos: i.avgPickPosition,
    delta: i.avgPickPosition - b.avgPickPosition,
    signal: signalStr,
  });
});

// Cards picked EARLIER with IWD (steals getting grabbed sooner)
const pickedEarlier = pickChanges.filter(c => c.delta < -0.5).sort((a, b) => a.delta - b.delta);
console.log('Cards Picked EARLIER with IWD (rising in value):');
console.log('─────────────────────────────────────────────────────────────────');
pickedEarlier.slice(0, 10).forEach(c => {
  console.log(`  ${c.name.padEnd(30)} ${c.basePos.toFixed(1).padStart(5)} → ${c.iwdPos.toFixed(1).padStart(5)}  (${c.delta.toFixed(1)})  [${c.signal}]`);
});

// Cards picked LATER with IWD (traps being avoided)
const pickedLater = pickChanges.filter(c => c.delta > 0.5).sort((a, b) => b.delta - a.delta);
console.log('\nCards Picked LATER with IWD (falling in value):');
console.log('─────────────────────────────────────────────────────────────────');
pickedLater.slice(0, 10).forEach(c => {
  console.log(`  ${c.name.padEnd(30)} ${c.basePos.toFixed(1).padStart(5)} → ${c.iwdPos.toFixed(1).padStart(5)}  (+${c.delta.toFixed(1)})  [${c.signal}]`);
});

// ============================================================================
// 3. WHEEL RATE CHANGES
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('3. WHEEL RATE CHANGES');
console.log('═══════════════════════════════════════════════════════════════\n');

const wheelChanges: { name: string; baseRate: number; iwdRate: number; delta: number; signal: string }[] = [];

Object.keys(baselineCards).forEach(cardName => {
  const b = baselineCards[cardName];
  const i = iwdCards[cardName];

  if (!b || !i) return;
  if (b.wheelOpportunities < 50 || i.wheelOpportunities < 50) return;

  const baseRate = (b.wheelCount / b.wheelOpportunities) * 100;
  const iwdRate = (i.wheelCount / i.wheelOpportunities) * 100;

  const signal = getCardSignal(cardName, []);
  const signalStr = signal.divergence
    ? signal.divergence.direction.toUpperCase()
    : signal.confidence;

  wheelChanges.push({
    name: cardName,
    baseRate,
    iwdRate,
    delta: iwdRate - baseRate,
    signal: signalStr,
  });
});

// Cards that wheel MORE with IWD (bots avoiding traps)
const wheelsMore = wheelChanges.filter(c => c.delta > 2).sort((a, b) => b.delta - a.delta);
console.log('Cards that WHEEL MORE with IWD (bots avoiding):');
console.log('─────────────────────────────────────────────────────────────────');
wheelsMore.slice(0, 10).forEach(c => {
  console.log(`  ${c.name.padEnd(30)} ${c.baseRate.toFixed(1).padStart(5)}% → ${c.iwdRate.toFixed(1).padStart(5)}%  (+${c.delta.toFixed(1)}%)  [${c.signal}]`);
});

// Cards that wheel LESS with IWD (bots grabbing steals)
const wheelsLess = wheelChanges.filter(c => c.delta < -2).sort((a, b) => a.delta - b.delta);
console.log('\nCards that WHEEL LESS with IWD (bots grabbing):');
console.log('─────────────────────────────────────────────────────────────────');
wheelsLess.slice(0, 10).forEach(c => {
  console.log(`  ${c.name.padEnd(30)} ${c.baseRate.toFixed(1).padStart(5)}% → ${c.iwdRate.toFixed(1).padStart(5)}%  (${c.delta.toFixed(1)}%)  [${c.signal}]`);
});

// ============================================================================
// 4. DECK QUALITY CHANGES
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('4. DECK QUALITY ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Average deck quality across all archetypes
let baselineAvgQuality = 0;
let iwdAvgQuality = 0;
let totalBaseDecks = 0;
let totalIwdDecks = 0;

archetypes.forEach(arch => {
  const b = baseline.archetypeDistribution[arch] as ArchetypeStats;
  const i = iwd.archetypeDistribution[arch] as ArchetypeStats;

  baselineAvgQuality += b.avgDeckQuality * b.count;
  iwdAvgQuality += i.avgDeckQuality * i.count;
  totalBaseDecks += b.count;
  totalIwdDecks += i.count;
});

baselineAvgQuality /= totalBaseDecks;
iwdAvgQuality /= totalIwdDecks;

console.log('Overall Deck Quality:');
console.log(`  Baseline:  ${baselineAvgQuality.toFixed(0)}`);
console.log(`  IWD:       ${iwdAvgQuality.toFixed(0)}`);
console.log(`  Delta:     ${(iwdAvgQuality - baselineAvgQuality) >= 0 ? '+' : ''}${(iwdAvgQuality - baselineAvgQuality).toFixed(0)}`);

// ============================================================================
// 5. COLOR BALANCE
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('5. COLOR BALANCE');
console.log('═══════════════════════════════════════════════════════════════\n');

const colors = ['W', 'U', 'B', 'R', 'G'];
console.log('Color    Base%    IWD%    Delta');
console.log('─────────────────────────────────────');
colors.forEach(color => {
  const basePct = ((baseline.colorDistribution[color] || 0) / baseline.totalDecks) * 100;
  const iwdPct = ((iwd.colorDistribution[color] || 0) / iwd.totalDecks) * 100;
  const delta = iwdPct - basePct;
  const sign = delta >= 0 ? '+' : '';
  console.log(`  ${color}      ${basePct.toFixed(1).padStart(5)}%   ${iwdPct.toFixed(1).padStart(5)}%   ${sign}${delta.toFixed(2)}%`);
});

// ============================================================================
// 6. DIVERGENCE IMPACT
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('6. IWD DIVERGENCE IMPACT');
console.log('═══════════════════════════════════════════════════════════════\n');

// Find all cards with divergent signals
const trapCards: { name: string; elo: number; iwd: number; pickDelta: number }[] = [];
const stealCards: { name: string; elo: number; iwd: number; pickDelta: number }[] = [];

Object.keys(baselineCards).forEach(cardName => {
  const signal = getCardSignal(cardName, []);
  if (!signal.divergence) return;

  const b = baselineCards[cardName];
  const i = iwdCards[cardName];
  if (!b || !i) return;

  const pickDelta = i.avgPickPosition - b.avgPickPosition;
  const elo = getEloData(cardName)?.elo || 0;
  const iwdVal = signal.iwd.value || 0;

  if (signal.divergence.direction === 'trap') {
    trapCards.push({ name: cardName, elo, iwd: iwdVal * 100, pickDelta });
  } else {
    stealCards.push({ name: cardName, elo, iwd: iwdVal * 100, pickDelta });
  }
});

console.log('TRAP Cards (High ELO, Low IWD) - Should be picked later:');
console.log('─────────────────────────────────────────────────────────────────');
trapCards.sort((a, b) => b.pickDelta - a.pickDelta).slice(0, 10).forEach(c => {
  const sign = c.pickDelta >= 0 ? '+' : '';
  console.log(`  ${c.name.padEnd(30)} ELO: ${c.elo.toFixed(0).padStart(4)}  IWD: ${c.iwd.toFixed(1).padStart(5)}%  Pick Δ: ${sign}${c.pickDelta.toFixed(1)}`);
});

console.log('\nSTEAL Cards (Low ELO, High IWD) - Should be picked earlier:');
console.log('─────────────────────────────────────────────────────────────────');
stealCards.sort((a, b) => a.pickDelta - b.pickDelta).slice(0, 10).forEach(c => {
  const sign = c.pickDelta >= 0 ? '+' : '';
  console.log(`  ${c.name.padEnd(30)} ELO: ${c.elo.toFixed(0).padStart(4)}  IWD: ${c.iwd.toFixed(1).padStart(5)}%  Pick Δ: ${sign}${c.pickDelta.toFixed(1)}`);
});

// ============================================================================
// 7. SUMMARY
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('7. SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Trap cards identified: ${trapCards.length}`);
console.log(`Steal cards identified: ${stealCards.length}`);
console.log(`Cards picked earlier with IWD: ${pickedEarlier.length}`);
console.log(`Cards picked later with IWD: ${pickedLater.length}`);
console.log(`Cards wheeling more with IWD: ${wheelsMore.length}`);
console.log(`Cards wheeling less with IWD: ${wheelsLess.length}`);
console.log(`Deck quality change: ${(iwdAvgQuality - baselineAvgQuality) >= 0 ? '+' : ''}${(iwdAvgQuality - baselineAvgQuality).toFixed(1)}`);

console.log('\n═══════════════════════════════════════════════════════════════\n');
