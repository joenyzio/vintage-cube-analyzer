# Simulation Comparison: Baseline vs IWD-Informed

Comparing 10,000 draft simulations each:
- **Baseline**: ELO + archetype affinity (how bots drafted before)
- **IWD-Informed**: ELO + archetype affinity + 17lands IWD signals

Both runs used seed 42 for reproducibility and identical cube composition.

---

## Executive Summary

The IWD integration produces **measurable but modest changes** in bot behavior. The system correctly:
- Deprioritizes trap cards (high ELO, low IWD)
- Prioritizes steal cards (low ELO, high IWD)
- Does not disrupt overall archetype balance

**Key finding**: Deck quality remains unchanged (1933 average), suggesting IWD adjustments correct individual card valuations without degrading overall draft coherence.

---

## 1. Archetype Emergence

| Archetype | Baseline | IWD | Delta | Quality Δ |
|-----------|----------|-----|-------|-----------|
| midrange | 25.9% | 25.9% | +0.03% | +2 |
| reanimator | 11.3% | 11.5% | +0.14% | -4 |
| ramp | 11.4% | 11.3% | -0.16% | -3 |
| tempo | 10.6% | 10.5% | -0.02% | +1 |
| aggro | 10.5% | 10.3% | -0.12% | +6 |
| artifacts | 7.0% | 7.0% | -0.01% | -6 |
| oath | 5.6% | 5.6% | -0.03% | -5 |
| control | 5.4% | 5.6% | +0.12% | +1 |
| doomsday | 4.8% | 4.8% | +0.04% | -1 |
| sneak | 4.7% | 4.8% | +0.10% | -5 |
| storm | 2.8% | 2.7% | -0.10% | -1 |

**Analysis**: Archetype distribution is stable within ±0.2%. This is expected — IWD adjustments affect individual card valuations, not macro-level archetype strategy. The bot's archetype commitment logic (via Madrury's preference vector) dominates pick decisions; IWD acts as a tiebreaker.

---

## 2. Cards Picked Earlier (Rising Value)

These cards moved up in pick order due to high IWD:

| Card | Base Pick | IWD Pick | Δ | Signal |
|------|-----------|----------|---|--------|
| Parallax Wave | 25.3 | 23.6 | -1.7 | STEAL |
| Emperor of Bones | 24.5 | 23.0 | -1.5 | STEAL |
| Brazen Borrower | 27.4 | 26.1 | -1.3 | STEAL |
| Wan Shi Tong | 23.1 | 22.0 | -1.1 | STEAL |
| Baleful Strix | 21.2 | 20.1 | -1.1 | STEAL |
| Shelldock Isle | 23.8 | 22.8 | -1.0 | STEAL |
| Phyrexian Metamorph | 25.1 | 24.2 | -0.9 | STEAL |
| Green Sun's Zenith | 27.2 | 26.3 | -0.9 | STEAL |
| Upheaval | 29.2 | 28.4 | -0.8 | STEAL |

**Pattern**: All top movers are STEAL cards — low ELO but high win rate contribution. The system correctly identifies these as undervalued.

---

## 3. Cards Picked Later (Falling Value)

These cards moved down in pick order due to low IWD:

| Card | Base Pick | IWD Pick | Δ | Signal |
|------|-----------|----------|---|--------|
| Path to Exile | 21.1 | 22.5 | +1.4 | TRAP |
| Gut, True Soul Zealot | 20.5 | 21.8 | +1.3 | TRAP |
| Bloodstained Mire | 19.9 | 20.9 | +1.0 | TRAP |

**Pattern**: TRAP cards are correctly deprioritized. Path to Exile is a notable example — high ELO (1596) but negative IWD (-0.4%) suggests it underperforms despite being picked early.

---

## 4. Wheel Rate Changes

### Cards Wheeling MORE (Bots Avoiding)

| Card | Base Wheel% | IWD Wheel% | Δ |
|------|-------------|------------|---|
| Solitude | 19.2% | 25.5% | +6.3% |
| Path to Exile | 5.3% | 9.7% | +4.4% |
| Incinerate | 39.3% | 44.4% | +5.1% |

### Cards Wheeling LESS (Bots Grabbing)

| Card | Base Wheel% | IWD Wheel% | Δ |
|------|-------------|------------|---|
| Brazen Borrower | 65.7% | 49.3% | -16.5% |
| Parallax Wave | 35.7% | 19.4% | -16.3% |
| Emperor of Bones | 27.8% | 15.4% | -12.4% |
| Green Sun's Zenith | 59.4% | 47.5% | -11.8% |
| Upheaval | 87.5% | 76.9% | -10.6% |
| Golos, Tireless Pilgrim | 85.7% | 75.6% | -10.1% |

**Analysis**: Steals wheel dramatically less often when IWD is active. Brazen Borrower's 16.5% wheel reduction is the largest swing — bots now grab it instead of letting it table.

---

## 5. Overall Deck Quality

| Metric | Baseline | IWD |
|--------|----------|-----|
| Average Deck Quality | 1933 | 1933 |
| Delta | — | -0.3 |

**Key finding**: Deck quality is unchanged. IWD adjustments don't degrade deck coherence — they just shift which cards fill slots.

---

## 6. Divergence Impact Analysis

### TRAP Cards Detected (4 total)

| Card | ELO | IWD | Pick Δ |
|------|-----|-----|--------|
| Path to Exile | 1596 | -0.4% | +1.4 |
| Gut, True Soul Zealot | 1611 | +0.7% | +1.3 |
| Bloodstained Mire | 1639 | +1.0% | +1.0 |
| Chrome Mox | 1722 | +0.2% | +0.4 |

### STEAL Cards Detected (20 total)

| Card | ELO | IWD | Pick Δ |
|------|-----|-----|--------|
| Parallax Wave | 1451 | +4.7% | -1.7 |
| Emperor of Bones | 1458 | +4.9% | -1.5 |
| Brazen Borrower | 1437 | +5.3% | -1.3 |
| Wan Shi Tong | 1420 | +5.6% | -1.1 |
| Baleful Strix | 1432 | +4.9% | -1.1 |
| Upheaval | 1412 | +7.1% | -0.8 |

**Observation**: The system identifies 5x more steals than traps. This suggests the cube community (reflected in ELO) tends to undervalue win-rate-contributing cards more often than it overvalues flashy cards.

---

## 7. Higher-Order Insights

### Do IWD-informed bots build better decks?
No measurable difference in deck quality. IWD acts as a **lateral correction** — cards swap positions but overall power level is unchanged.

### Are there cards the prior bots overrated?
Yes: **Path to Exile** (picked 1.4 picks later), **Bloodstained Mire** (1 pick later). Both have high community ELO but underperform in actual games.

### Cube tuning implications

**Cards to consider cutting** (high wheel rate, low IWD):
- Incinerate (44% wheel, unknown IWD)
- Phlage (51% wheel, aligned)
- Lurrus (52% wheel, aligned)

**Cards performing better than expected** (low ELO, high IWD):
- Upheaval (+7.1% IWD, massively undervalued)
- Wan Shi Tong (+5.6% IWD)
- Brazen Borrower (+5.3% IWD)

### Do certain colors benefit more from IWD data?

Blue gains slightly (+0.41% share), Black loses slightly (-0.34%). This aligns with the steal card distribution — many steals are blue (Brazen Borrower, Upheaval, Shelldock Isle).

---

## 8. Methodology

**Simulation parameters**:
- 10,000 drafts each
- 8 players per draft
- Seed: 42 (deterministic)
- Same cube composition (360 cards)

**IWD adjustment logic**:
- TRAP cards: -100 to contextual score
- STEAL cards: +50 to contextual score
- Aligned/Unknown: no adjustment

**Thresholds**:
- TRAP: ELO ≥ 75th percentile AND IWD < 1%
- STEAL: ELO < 50th percentile AND IWD > 3%

---

## 9. Limitations

1. **IWD coverage**: Only 306 of 360 cards have 17lands data. 54 cards use ELO-only.
2. **Color-filtering in sims**: Bots use global IWD, not color-filtered. Color-filtered IWD is only applied in the coaching UI during actual drafts.
3. **Sample sizes**: Some cards have fewer appearances, making their pick position deltas noisier.

---

## Files

- Baseline data: `scripts/simulation-data-baseline.json`
- IWD data: `scripts/simulation-data-iwd.json`
- Comparison script: `scripts/compare-simulations.ts`
