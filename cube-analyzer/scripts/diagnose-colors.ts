#!/usr/bin/env npx tsx
/**
 * Diagnose Color Commitment Timing
 *
 * Tracks when drafters add their 2nd and 3rd colors.
 */

import cubeData from '../src/data/cards.json';
import type { CubeCard } from '../src/types/card';
import { simulateDraft } from './simulation/draft-engine';

const cube = cubeData as CubeCard[];

// Run 100 drafts and track color timing
const results: {
  secondColorPick: number[];
  thirdColorPick: number[];
}[] = [];

for (let i = 0; i < 100; i++) {
  const draft = simulateDraft(cube, 12345 + i);

  for (const entry of draft.pickLog) {
    // Track color additions per drafter
  }
}

// Analyze pick log to find when colors are added
interface DrafterColorHistory {
  picks: { pick: number; colors: Set<string> }[];
  secondColorPick: number | null;
  thirdColorPick: number | null;
}

function analyzeDraft(seed: number): DrafterColorHistory[] {
  const draft = simulateDraft(cube, seed);
  const drafterHistories: DrafterColorHistory[] = Array(8).fill(null).map(() => ({
    picks: [],
    secondColorPick: null,
    thirdColorPick: null,
  }));

  // Group picks by drafter
  const picksByDrafter: Map<number, { pick: number; card: string; colors: string[] }[]> = new Map();

  for (const entry of draft.pickLog) {
    if (!picksByDrafter.has(entry.drafterId)) {
      picksByDrafter.set(entry.drafterId, []);
    }

    // Find the card in cube data
    const card = cube.find(c => c.name === entry.cardPicked);
    const colors = card?.color_identity || [];

    const overallPick = (entry.round - 1) * 15 + entry.pick;
    picksByDrafter.get(entry.drafterId)!.push({
      pick: overallPick,
      card: entry.cardPicked,
      colors,
    });
  }

  // Analyze each drafter
  for (const [drafterId, picks] of picksByDrafter) {
    const history = drafterHistories[drafterId];
    const colorsSeenSoFar = new Set<string>();

    for (const pick of picks) {
      const prevSize = colorsSeenSoFar.size;

      for (const color of pick.colors) {
        colorsSeenSoFar.add(color);
      }

      const newSize = colorsSeenSoFar.size;

      if (prevSize < 2 && newSize >= 2 && history.secondColorPick === null) {
        history.secondColorPick = pick.pick;
      }

      if (prevSize < 3 && newSize >= 3 && history.thirdColorPick === null) {
        history.thirdColorPick = pick.pick;
      }
    }
  }

  return drafterHistories;
}

// Run analysis
console.log('Analyzing color commitment timing across 100 drafts...\n');

const allSecondColorPicks: number[] = [];
const allThirdColorPicks: number[] = [];

for (let i = 0; i < 100; i++) {
  const histories = analyzeDraft(12345 + i);

  for (const h of histories) {
    if (h.secondColorPick !== null) allSecondColorPicks.push(h.secondColorPick);
    if (h.thirdColorPick !== null) allThirdColorPicks.push(h.thirdColorPick);
  }
}

// Calculate stats
function stats(arr: number[]): { mean: number; median: number; p25: number; p75: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  return { mean: Math.round(mean * 10) / 10, median, p25, p75 };
}

const secondStats = stats(allSecondColorPicks);
const thirdStats = stats(allThirdColorPicks);

console.log('SECOND COLOR TIMING:');
console.log(`  Mean: pick ${secondStats.mean}`);
console.log(`  Median: pick ${secondStats.median}`);
console.log(`  25th percentile: pick ${secondStats.p25}`);
console.log(`  75th percentile: pick ${secondStats.p75}`);
console.log(`  Sample size: ${allSecondColorPicks.length} drafters`);

console.log('\nTHIRD COLOR TIMING:');
console.log(`  Mean: pick ${thirdStats.mean}`);
console.log(`  Median: pick ${thirdStats.median}`);
console.log(`  25th percentile: pick ${thirdStats.p25}`);
console.log(`  75th percentile: pick ${thirdStats.p75}`);
console.log(`  Sample size: ${allThirdColorPicks.length} drafters (${Math.round(allThirdColorPicks.length / 8)}% of drafters add 3rd color)`);

// Distribution buckets
const thirdColorBuckets = {
  early: allThirdColorPicks.filter(p => p <= 10).length,
  midEarly: allThirdColorPicks.filter(p => p > 10 && p <= 20).length,
  midLate: allThirdColorPicks.filter(p => p > 20 && p <= 30).length,
  late: allThirdColorPicks.filter(p => p > 30).length,
};

console.log('\nTHIRD COLOR DISTRIBUTION:');
console.log(`  Pick 1-10 (very early): ${thirdColorBuckets.early} (${Math.round(thirdColorBuckets.early / allThirdColorPicks.length * 100)}%)`);
console.log(`  Pick 11-20 (early-mid): ${thirdColorBuckets.midEarly} (${Math.round(thirdColorBuckets.midEarly / allThirdColorPicks.length * 100)}%)`);
console.log(`  Pick 21-30 (mid-late): ${thirdColorBuckets.midLate} (${Math.round(thirdColorBuckets.midLate / allThirdColorPicks.length * 100)}%)`);
console.log(`  Pick 31-45 (late): ${thirdColorBuckets.late} (${Math.round(thirdColorBuckets.late / allThirdColorPicks.length * 100)}%)`);

console.log('\nDIAGNOSIS:');
if (thirdStats.mean < 15) {
  console.log('  Third color added VERY EARLY (pack 1). Color penalties too weak early in draft.');
} else if (thirdStats.mean < 25) {
  console.log('  Third color added EARLY-MID (pack 1-2). Color penalties need strengthening.');
} else if (thirdStats.mean < 35) {
  console.log('  Third color added MID-LATE (pack 2-3). Reasonable but could be tighter.');
} else {
  console.log('  Third color added LATE (pack 3). This is healthy splashing behavior.');
}
