# Archetype Affinity Uncertainties

Cards where judgment calls were made that may need revisiting based on real draft experience.

## Uncertain Mappings

### Archetype-Defining Status

| Card | Current Status | Uncertainty |
|------|----------------|-------------|
| Mishra's Workshop | Archetype-defining (Artifacts) | Could argue it's "just" an S-tier enabler since Tinker/Academy can carry Artifacts without it |
| Lion's Eye Diamond | Archetype-defining (Storm, Doomsday) | Marked defining for both - but some Storm builds work without LED |
| Natural Order | Archetype-defining (Ramp) | Green ramp exists without Natural Order; maybe A-tier enabler instead |

### Tier Assignments

| Card | Current | Alternative | Notes |
|------|---------|-------------|-------|
| Recurring Nightmare | S-tier Reanimator | A-tier? | Slower than Reanimate/Animate Dead but recursive value is unique |
| Time Walk | S-tier Tempo | Also S-tier Storm? | Currently A-tier in Storm; may undervalue it |
| Shelldock Isle | B-tier Sneak | A-tier? | Can enable Show and Tell lines; might be undervalued |
| Teferi, Time Raveler | A-tier Control/Tempo | S-tier? | Format-warping card might deserve S |
| Upheaval | A-tier Control | S-tier? | Win condition that probably deserves higher |

### Multi-Archetype Weights

| Card | Archetypes | Uncertainty |
|------|------------|-------------|
| Griselbrand | Reanimator S, Sneak S, Oath S | All three S-tier feels right but maybe Reanimator should be slightly higher |
| Dark Confidant | Midrange S | Should it also be B-tier Aggro? Some aggro decks want it |
| Sylvan Library | Midrange S | Could argue for Ramp A-tier or Control B-tier too |
| Expressive Iteration | Tempo A, Midrange B | Might deserve Storm C-tier for card selection |

### Anti-Synergy Completeness

| Card | Current | Question |
|------|---------|----------|
| Monastery Mentor | Oath -0.5 | Makes tokens - should penalty be higher (-0.7)? |
| Young Pyromancer | Not mapped | Missing from cube? If present, needs Oath anti-synergy |
| Bitterblossom | Not mapped | Missing from cube? Would need Oath anti-synergy |

### Cards That Might Be Missing

These cards may warrant explicit affinities but currently rely on property rules:

- Candelabra of Tawnos (Storm? Artifacts?)
- Sensei's Divining Top (already mapped but verify tiers)
- Coveted Jewel (Artifacts B-tier?)
- Currency Converter (Artifacts support?)
- Displacer Kitten (Storm combo piece?)

---

## Draft Feedback Log

Record observations from actual drafts here. Don't fix immediately - collect patterns first.

### Template

```
**Date:** YYYY-MM-DD
**Card:** [Card Name]
**Issue:** [Badge missing | Wrong archetype | Wrong tier | etc.]
**Pool context:** [What cards were in pool]
**Expected:** [What should have shown]
**Actual:** [What actually showed]
**Notes:** [Any additional context]
```

### Observations

(None yet - add entries as you draft)

---

## Implementation Notes

- System uses 2+ card threshold before showing conditional value
- Archetype-defining cards show badge even with empty pool
- Multi-archetype cards pick archetype with highest pool support count
- Anti-synergy weights are negative (e.g., -0.7 for mana dorks in Oath)

Last updated: 2025-05-16
