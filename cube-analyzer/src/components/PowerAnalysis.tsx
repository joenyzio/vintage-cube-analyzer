import { useMemo, useState } from 'react';
import type { CubeCard } from '../types/card';
import { getEloData, getPercentile } from '../services/eloHelpers';
import { getCardImage } from '../services/scryfall';
import { CardPreview } from './CardPreview';
import {
  ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Zap, Coins, Crosshair, Shield, RotateCcw, Swords, Target, Sparkles, Wand2,
  ArrowUpDown, Hash, Percent
} from 'lucide-react';

interface Props {
  cards: CubeCard[];
}

interface MechanicStats {
  name: string;
  count: number;
  avgElo: number;
  avgPercentile: number;
  topCards: { name: string; elo: number; card: CubeCard }[];
  category?: string;
}

// Definitions for mechanics
const MECHANIC_DEFINITIONS: Record<string, string> = {
  // Card Advantage
  'Draw cards': 'Cards that let you draw additional cards, increasing your hand size and options.',
  'Cantrip': 'A spell that replaces itself by drawing a card. Cheap, efficient card flow.',
  'Tutor': 'Search your library for a specific card. Powerful consistency tool.',
  'Scry': 'Look at top cards and choose to keep or bottom them. Smooths draws.',
  'Surveil': 'Like scry but cards go to graveyard. Good with graveyard synergies.',
  'Impulse draw': 'Exile cards from top of library that you can play this turn. Red\'s card advantage.',
  // Mana
  'Mana dork': 'Creatures that tap for mana. Fast but vulnerable acceleration.',
  'Mana rock': 'Artifacts that tap for mana. Resilient acceleration.',
  'Cost reduction': 'Makes spells cheaper to cast. Enables explosive turns.',
  'Free spell': 'Cast spells without paying mana cost. Extremely powerful.',
  'Treasure': 'Creates Treasure tokens for one-shot mana. Flexible acceleration.',
  // Removal
  'Destroy creature': 'Permanently removes creatures from the battlefield.',
  'Exile': 'Removes permanents completely, bypassing indestructible and recursion.',
  'Damage-based': 'Deals damage to remove creatures. Can also hit players.',
  'Board wipe': 'Destroys all creatures at once. Resets the board.',
  '-X/-X': 'Shrinks creatures. Gets around indestructible.',
  'Bounce': 'Returns permanents to hand. Temporary removal, gains tempo.',
  // Disruption
  'Counter spell': 'Prevents a spell from resolving. Blue\'s signature ability.',
  'Counter unless': 'Soft counter that can be paid around. Efficient but not absolute.',
  'Discard': 'Forces opponent to discard cards. Attacks their hand.',
  // Protection
  'Hexproof': 'Can\'t be targeted by opponents. Strong protection.',
  'Indestructible': 'Can\'t be destroyed by damage or destroy effects.',
  'Protection from': 'Can\'t be blocked, targeted, dealt damage, or enchanted by chosen quality.',
  'Ward': 'Opponents must pay extra to target. Soft protection.',
  'Can\'t be countered': 'Spell will resolve regardless of counterspells.',
  // Recursion
  'Return from graveyard': 'Brings cards back from graveyard. Value over time.',
  'Reanimate': 'Put creatures from graveyard directly onto battlefield. Cheats mana costs.',
  'Flashback': 'Cast spell again from graveyard. Built-in two-for-one.',
  'Unearth': 'Return creature from graveyard temporarily. Aggressive recursion.',
  'Escape': 'Cast from graveyard by exiling other cards. Repeatable.',
  // Combat
  'Pump spell': 'Increases power/toughness. Combat trick.',
  'First strike': 'Deals damage before normal combat damage.',
  'Double strike': 'Deals both first strike and normal damage. Very powerful.',
  'Trample': 'Excess damage goes through to player. Great on big creatures.',
  'Flying': 'Can only be blocked by flyers/reach. Evasion.',
  'Haste': 'Can attack immediately. Surprises opponents.',
  'Vigilance': 'Doesn\'t tap to attack. Attacks and blocks.',
  'Lifelink': 'Damage dealt also gains you life. Racing tool.',
  'Deathtouch': 'Any damage destroys creature. Efficient removal on a body.',
  'Menace': 'Must be blocked by two or more creatures. Evasion.',
  'Reach': 'Can block flying creatures.',
  // Tokens
  'Create token': 'Creates creature tokens. Builds board presence.',
  'Token on ETB': 'Creates tokens when entering. Immediate value.',
  // Enters Play
  'Enters the Battlefield': 'Triggers when permanent enters play. Immediate value.',
  'Blink/Flicker': 'Exile and return a permanent. Reuses ETB effects.',
  // Combo
  'Storm': 'Copies spell for each spell cast before it. Explosive combo potential.',
  'Copy spell': 'Duplicates a spell. Doubles effects.',
  'Untap': 'Untaps permanents. Enables combo loops.',
  'Extra turn': 'Take another turn. Extremely powerful.',
  'Cascade': 'Cast a free spell when you cast this. Value engine.',
  // Special mechanics
  'Initiative': 'Take the initiative and venture into Undercity. Snowballing advantage.',
  'Monarch': 'Draw an extra card each turn while you\'re the monarch.',
  'Annihilator': 'Forces sacrifice on attack. Devastating with big Eldrazi.',
  'Phyrexian mana': 'Pay life instead of mana. Broken mana efficiency.',
  'Delve': 'Exile cards from graveyard to pay costs. Often makes spells free.',
  'Affinity': 'Costs less based on permanents you control. Can be free.',
  'Convoke': 'Tap creatures to help pay costs. Goes wide fast.',
  'Channel': 'Discard for an effect. Flexible modal cards.',
  'Ninjutsu': 'Swap attacking creature for ninja. Surprise damage + ETB.',
  'Evoke': 'Pay less for ETB effect but sacrifice creature.',
  'Miracle': 'Massively discounted when drawn for turn.',
  'Prowess': 'Gets +1/+1 for each noncreature spell. Rewards spell-heavy decks.',
  'Planeswalker': 'Repeatable effects each turn. Card advantage engine.',
  // More mechanics
  'Companion': 'Start game with access to this card if you meet restriction. Broken.',
  'Adventure': 'Cast as instant/sorcery first, then as creature later. Two-for-one.',
  'Cycling': 'Discard for a new card. Smooths draws, enables synergies.',
  'Landfall': 'Triggers when a land enters. Rewards land drops.',
  'Kicker': 'Pay extra for a bigger effect. Modal flexibility.',
  'Undying': 'Returns from death with +1/+1 counter if it had none.',
  'Persist': 'Returns from death with -1/-1 counter if it had none.',
  'Blitz': 'Cheap haste creature that draws a card when it dies.',
  'Connive': 'Draw, discard, get counter if nonland discarded. Card selection.',
  'Exploit': 'Sacrifice a creature for an effect when this enters.',
  'Crew': 'Tap creatures to turn vehicle into creature.',
  'Embalm': 'Create token copy from graveyard. Recursion.',
  'Eternalize': 'Create 4/4 token copy from graveyard. Recursion.',
  'Retrace': 'Cast from graveyard by discarding a land.',
  'Jump-start': 'Cast from graveyard by discarding a card.',
  'Overload': 'Pay more to affect all instead of one target.',
  'Spectacle': 'Cheaper if opponent lost life this turn.',
  'Dash': 'Pay dash cost for haste, returns to hand at end of turn.',
  'Modular': 'Has +1/+1 counters that move to another artifact when it dies.',
  'Fabricate': 'Choose +1/+1 counters or create Servo tokens.',
  'Riot': 'Choose haste or +1/+1 counter when it enters.',
  'Wrath effect': 'Destroys all creatures. Board reset.',
};

// Text patterns to search in oracle text
const TEXT_PATTERNS: { name: string; pattern: RegExp; category: string }[] = [
  // Card advantage
  { name: 'Draw cards', pattern: /draw (a |one |two |three |\d+ )?cards?/i, category: 'Card Advantage' },
  { name: 'Cantrip', pattern: /draw a card\./i, category: 'Card Advantage' },
  { name: 'Tutor', pattern: /search your library/i, category: 'Card Advantage' },
  { name: 'Scry', pattern: /scry \d/i, category: 'Card Advantage' },
  { name: 'Surveil', pattern: /surveil \d/i, category: 'Card Advantage' },
  { name: 'Impulse draw', pattern: /exile the top.*you may (play|cast)/i, category: 'Card Advantage' },

  // Mana
  { name: 'Mana dork', pattern: /add \{[WUBRGC]\}/i, category: 'Mana' },
  { name: 'Mana rock', pattern: /\{T\}: Add/i, category: 'Mana' },
  { name: 'Cost reduction', pattern: /costs? \{\d\} less/i, category: 'Mana' },
  { name: 'Free spell', pattern: /without paying (its |their )?mana cost/i, category: 'Mana' },
  { name: 'Treasure', pattern: /treasure token/i, category: 'Mana' },

  // Removal
  { name: 'Destroy creature', pattern: /destroy target (creature|permanent)/i, category: 'Removal' },
  { name: 'Exile', pattern: /exile target/i, category: 'Removal' },
  { name: 'Damage-based', pattern: /deals? \d+ damage to (any target|target creature)/i, category: 'Removal' },
  { name: 'Board wipe', pattern: /destroy all (creatures|nonland permanents|permanents)/i, category: 'Removal' },
  { name: '-X/-X', pattern: /gets? -\d\/-\d/i, category: 'Removal' },
  { name: 'Bounce', pattern: /return target.*to (its owner's|their owner's) hand/i, category: 'Removal' },

  // Counterspells
  { name: 'Counter spell', pattern: /counter target spell/i, category: 'Disruption' },
  { name: 'Counter unless', pattern: /counter.*unless/i, category: 'Disruption' },
  { name: 'Discard', pattern: /(target player|opponent) discards/i, category: 'Disruption' },
  { name: 'Hand attack', pattern: /look at target (player's|opponent's) hand/i, category: 'Disruption' },

  // Protection
  { name: 'Hexproof', pattern: /hexproof/i, category: 'Protection' },
  { name: 'Indestructible', pattern: /indestructible/i, category: 'Protection' },
  { name: 'Protection from', pattern: /protection from/i, category: 'Protection' },
  { name: 'Ward', pattern: /ward \{/i, category: 'Protection' },
  { name: 'Can\'t be countered', pattern: /can't be countered/i, category: 'Protection' },

  // Recursion
  { name: 'Return from graveyard', pattern: /return.*from (your )?graveyard/i, category: 'Recursion' },
  { name: 'Reanimate', pattern: /put.*creature card.*onto the battlefield/i, category: 'Recursion' },
  { name: 'Flashback', pattern: /flashback/i, category: 'Recursion' },
  { name: 'Unearth', pattern: /unearth/i, category: 'Recursion' },
  { name: 'Escape', pattern: /escape—/i, category: 'Recursion' },

  // Combat tricks
  { name: 'Pump spell', pattern: /gets? \+\d\/\+\d/i, category: 'Combat' },
  { name: 'First strike', pattern: /first strike/i, category: 'Combat' },
  { name: 'Double strike', pattern: /double strike/i, category: 'Combat' },
  { name: 'Trample', pattern: /\btrample\b/i, category: 'Combat' },
  { name: 'Flying', pattern: /\bflying\b/i, category: 'Combat' },
  { name: 'Haste', pattern: /\bhaste\b/i, category: 'Combat' },
  { name: 'Vigilance', pattern: /\bvigilance\b/i, category: 'Combat' },
  { name: 'Lifelink', pattern: /\blifelink\b/i, category: 'Combat' },
  { name: 'Deathtouch', pattern: /\bdeathtouch\b/i, category: 'Combat' },
  { name: 'Menace', pattern: /\bmenace\b/i, category: 'Combat' },

  // Tokens
  { name: 'Create token', pattern: /create.*token/i, category: 'Tokens' },
  { name: 'Token on ETB', pattern: /enters.*create.*token/i, category: 'Tokens' },

  // Enters the battlefield
  { name: 'Enters the Battlefield', pattern: /when .* enters (the battlefield)?/i, category: 'Enters Play' },
  { name: 'Blink/Flicker', pattern: /exile.*return.*to the battlefield/i, category: 'Enters Play' },

  // Storm/Combo
  { name: 'Storm', pattern: /\bstorm\b/i, category: 'Combo' },
  { name: 'Copy spell', pattern: /copy (that |target )?spell/i, category: 'Combo' },
  { name: 'Untap', pattern: /untap (target|all|each)/i, category: 'Combo' },
  { name: 'Extra turn', pattern: /extra turn/i, category: 'Combo' },
  { name: 'Cascade', pattern: /\bcascade\b/i, category: 'Combo' },

  // Special mechanics
  { name: 'Initiative', pattern: /take the initiative|the initiative/i, category: 'Special' },
  { name: 'Monarch', pattern: /become the monarch|you're the monarch/i, category: 'Special' },
  { name: 'Annihilator', pattern: /annihilator \d/i, category: 'Special' },
  { name: 'Phyrexian mana', pattern: /\{[WUBRG]\/P\}/i, category: 'Special' },
  { name: 'Delve', pattern: /\bdelve\b/i, category: 'Special' },
  { name: 'Affinity', pattern: /\baffinity\b/i, category: 'Special' },
  { name: 'Convoke', pattern: /\bconvoke\b/i, category: 'Special' },
  { name: 'Channel', pattern: /\bchannel\b.*discard this card/i, category: 'Special' },
  { name: 'Ninjutsu', pattern: /\bninjutsu\b/i, category: 'Special' },
  { name: 'Evoke', pattern: /\bevoke\b/i, category: 'Special' },
  { name: 'Miracle', pattern: /\bmiracle\b/i, category: 'Special' },
  { name: 'Prowess', pattern: /\bprowess\b/i, category: 'Combat' },
  { name: 'Suspend', pattern: /\bsuspend \d/i, category: 'Special' },
  { name: 'Dredge', pattern: /\bdredge \d/i, category: 'Recursion' },
  { name: 'Madness', pattern: /\bmadness\b/i, category: 'Special' },
  { name: 'Foretell', pattern: /\bforetell\b/i, category: 'Special' },
  { name: 'Companion', pattern: /\bcompanion\b/i, category: 'Special' },
  { name: 'Adventure', pattern: /\badventure\b/i, category: 'Special' },
  { name: 'Cycling', pattern: /\bcycling\b/i, category: 'Card Advantage' },
  { name: 'Landfall', pattern: /\blandfall\b/i, category: 'Special' },
  { name: 'Kicker', pattern: /\bkicker\b/i, category: 'Special' },
  { name: 'Undying', pattern: /\bundying\b/i, category: 'Recursion' },
  { name: 'Persist', pattern: /\bpersist\b/i, category: 'Recursion' },
  { name: 'Blitz', pattern: /\bblitz\b/i, category: 'Special' },
  { name: 'Connive', pattern: /\bconnive\b/i, category: 'Card Advantage' },
  { name: 'Exploit', pattern: /\bexploit\b/i, category: 'Special' },
  { name: 'Crew', pattern: /\bcrew \d/i, category: 'Special' },
  { name: 'Embalm', pattern: /\bembalm\b/i, category: 'Recursion' },
  { name: 'Eternalize', pattern: /\beternalize\b/i, category: 'Recursion' },
  { name: 'Retrace', pattern: /\bretrace\b/i, category: 'Recursion' },
  { name: 'Jump-start', pattern: /\bjump-start\b/i, category: 'Recursion' },
  { name: 'Overload', pattern: /\boverload\b/i, category: 'Special' },
  { name: 'Spectacle', pattern: /\bspectacle\b/i, category: 'Special' },
  { name: 'Dash', pattern: /\bdash\b/i, category: 'Combat' },
  { name: 'Modular', pattern: /\bmodular\b/i, category: 'Special' },
  { name: 'Fabricate', pattern: /\bfabricate\b/i, category: 'Tokens' },
  { name: 'Riot', pattern: /\briot\b/i, category: 'Combat' },

  // Planeswalker-specific
  { name: 'PW +ability', pattern: /\+\d+:/i, category: 'Planeswalker' },
  { name: 'PW -ability', pattern: /-\d+:/i, category: 'Planeswalker' },
  { name: 'PW ultimate', pattern: /-[6-9]\d*:|−1[0-9]:/i, category: 'Planeswalker' },
];

// Card type patterns
const TYPE_PATTERNS = [
  'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land',
  'Legendary', 'Tribal', 'Equipment', 'Aura', 'Vehicle',
];

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  'Mana': { icon: Coins, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
  'Card Advantage': { icon: Sparkles, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
  'Removal': { icon: Crosshair, color: 'text-red-400', gradient: 'from-red-500/20 to-red-500/5' },
  'Disruption': { icon: Zap, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
  'Combat': { icon: Swords, color: 'text-orange-400', gradient: 'from-orange-500/20 to-orange-500/5' },
  'Protection': { icon: Shield, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-500/5' },
  'Recursion': { icon: RotateCcw, color: 'text-green-400', gradient: 'from-green-500/20 to-green-500/5' },
  'Combo': { icon: Wand2, color: 'text-pink-400', gradient: 'from-pink-500/20 to-pink-500/5' },
  'Enters Play': { icon: Target, color: 'text-indigo-400', gradient: 'from-indigo-500/20 to-indigo-500/5' },
  'Tokens': { icon: Hash, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  'Planeswalker': { icon: Sparkles, color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-500/5' },
  'Special': { icon: Zap, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-yellow-500/5' },
  'Keyword': { icon: Zap, color: 'text-white/60', gradient: 'from-white/10 to-white/5' },
};

function getStrengthColor(delta: number): string {
  if (delta >= 15) return 'rgb(34, 197, 94)'; // green-500
  if (delta >= 8) return 'rgb(132, 204, 22)'; // lime-500
  if (delta >= 3) return 'rgb(234, 179, 8)'; // yellow-500
  if (delta >= -3) return 'rgb(156, 163, 175)'; // gray-400
  if (delta >= -8) return 'rgb(251, 146, 60)'; // orange-400
  if (delta >= -15) return 'rgb(248, 113, 113)'; // red-400
  return 'rgb(239, 68, 68)'; // red-500
}

function getStrengthBg(delta: number): string {
  if (delta >= 10) return 'bg-green-500/20 border-green-500/30';
  if (delta >= 3) return 'bg-emerald-500/10 border-emerald-500/20';
  if (delta >= -3) return 'bg-white/[0.04] border-white/10';
  if (delta >= -10) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function MechanicRow({
  stat,
  baselinePercentile,
  showExamples = true
}: {
  stat: MechanicStats;
  baselinePercentile: number;
  showExamples?: boolean;
}) {
  const delta = stat.avgPercentile - baselinePercentile;
  const barColor = getStrengthColor(delta);
  const bgClass = getStrengthBg(delta);

  return (
    <div className={`rounded-lg border p-3 transition-all hover:scale-[1.01] ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{stat.name}</span>
          <span className="text-xs text-white/30 font-mono">×{stat.count}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold font-mono"
            style={{ color: barColor }}
          >
            {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
          </span>
          <span className="text-xs text-white/40 font-mono w-10 text-right">{stat.avgPercentile}%</span>
        </div>
      </div>

      {/* Power bar */}
      <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(5, stat.avgPercentile))}%`,
            backgroundColor: barColor
          }}
        />
      </div>

      {/* Example cards */}
      {showExamples && stat.topCards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {stat.topCards.slice(0, 3).map(card => (
            <span
              key={card.name}
              className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-white/50 truncate max-w-[120px]"
              title={`${card.name} (${card.elo})`}
            >
              {card.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  stats,
  expanded,
  onToggle,
  baselinePercentile,
  sortBy
}: {
  category: string;
  stats: MechanicStats[];
  expanded: boolean;
  onToggle: () => void;
  baselinePercentile: number;
  sortBy: 'strength' | 'count';
}) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Keyword'];
  const Icon = config.icon;

  const sorted = [...stats].sort((a, b) =>
    sortBy === 'strength'
      ? b.avgPercentile - a.avgPercentile
      : b.count - a.count
  );

  const avgDelta = stats.reduce((sum, s) => sum + (s.avgPercentile - baselinePercentile), 0) / stats.length;
  const displayStats = expanded ? sorted : sorted.slice(0, 4);

  return (
    <div className={`rounded-xl border border-white/[0.06] overflow-hidden bg-gradient-to-br ${config.gradient}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">{category}</h3>
            <p className="text-xs text-white/40">{stats.length} mechanics tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-mono font-bold"
            style={{ color: getStrengthColor(avgDelta) }}
          >
            avg {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(0)}%
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayStats.map(stat => (
          <MechanicRow
            key={stat.name}
            stat={stat}
            baselinePercentile={baselinePercentile}
          />
        ))}
      </div>

      {!expanded && stats.length > 4 && (
        <button
          onClick={onToggle}
          className="w-full py-2 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors border-t border-white/[0.06]"
        >
          Show {stats.length - 4} more
        </button>
      )}
    </div>
  );
}

function QuickStat({ label, value, subtext, trend }: { label: string; value: string; subtext: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
        {value}
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
      </div>
      <div className="text-xs text-white/30 mt-1">{subtext}</div>
    </div>
  );
}

export function PowerAnalysis({ cards }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedMechanic, setExpandedMechanic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ranked' | 'mechanics' | 'colors' | 'types' | 'cmc'>('ranked');
  const [sortBy, setSortBy] = useState<'strength' | 'count'>('strength');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate baseline (average) percentile for all cards
  const baselinePercentile = useMemo(() => {
    let total = 0;
    let count = 0;
    cards.forEach(card => {
      const percentile = getPercentile(card.name);
      if (percentile > 0) {
        total += percentile;
        count++;
      }
    });
    return count > 0 ? total / count : 50;
  }, [cards]);

  // Analyze mechanics from oracle text
  const mechanicsAnalysis = useMemo(() => {
    const stats: Record<string, { cards: CubeCard[]; totalPercentile: number; category: string }> = {};

    cards.forEach(card => {
      const text = card.oracle_text || '';
      const percentile = getPercentile(card.name);
      if (percentile === 0) return;

      // Check keywords
      (card.keywords || []).forEach(keyword => {
        if (!stats[keyword]) {
          stats[keyword] = { cards: [], totalPercentile: 0, category: 'Keyword' };
        }
        stats[keyword].cards.push(card);
        stats[keyword].totalPercentile += percentile;
      });

      // Check text patterns
      TEXT_PATTERNS.forEach(({ name, pattern, category }) => {
        if (pattern.test(text)) {
          if (!stats[name]) {
            stats[name] = { cards: [], totalPercentile: 0, category };
          }
          if (!stats[name].cards.find(c => c.name === card.name)) {
            stats[name].cards.push(card);
            stats[name].totalPercentile += percentile;
          }
        }
      });
    });

    const result: MechanicStats[] = Object.entries(stats)
      .filter(([_, data]) => data.cards.length >= 3)
      .map(([name, data]) => {
        const avgPercentile = data.totalPercentile / data.cards.length;
        const avgElo = data.cards.reduce((sum, c) => sum + (getEloData(c.name)?.elo || 0), 0) / data.cards.length;
        const topCards = data.cards
          .map(c => ({ name: c.name, elo: getEloData(c.name)?.elo || 0, card: c }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 12);

        return {
          name,
          count: data.cards.length,
          avgElo: Math.round(avgElo),
          avgPercentile: Math.round(avgPercentile),
          topCards,
          category: data.category,
        };
      });

    const byCategory: Record<string, MechanicStats[]> = {};
    result.forEach(stat => {
      const cat = stat.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(stat);
    });

    return byCategory;
  }, [cards]);

  // Analyze by color
  const colorAnalysis = useMemo(() => {
    const stats: Record<string, { cards: CubeCard[]; totalPercentile: number }> = {
      'White': { cards: [], totalPercentile: 0 },
      'Blue': { cards: [], totalPercentile: 0 },
      'Black': { cards: [], totalPercentile: 0 },
      'Red': { cards: [], totalPercentile: 0 },
      'Green': { cards: [], totalPercentile: 0 },
      'Colorless': { cards: [], totalPercentile: 0 },
      'Multicolor': { cards: [], totalPercentile: 0 },
    };

    const colorMap: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

    cards.forEach(card => {
      const percentile = getPercentile(card.name);
      if (percentile === 0) return;

      const colors = card.colors || [];
      let category: string;

      if (colors.length === 0) {
        category = 'Colorless';
      } else if (colors.length > 1) {
        category = 'Multicolor';
      } else {
        category = colorMap[colors[0]] || 'Colorless';
      }

      stats[category].cards.push(card);
      stats[category].totalPercentile += percentile;
    });

    return Object.entries(stats)
      .filter(([_, data]) => data.cards.length > 0)
      .map(([name, data]) => {
        const avgPercentile = data.totalPercentile / data.cards.length;
        const avgElo = data.cards.reduce((sum, c) => sum + (getEloData(c.name)?.elo || 0), 0) / data.cards.length;
        const topCards = data.cards
          .map(c => ({ name: c.name, elo: getEloData(c.name)?.elo || 0, card: c }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 12);

        return { name, count: data.cards.length, avgElo: Math.round(avgElo), avgPercentile: Math.round(avgPercentile), topCards };
      })
      .sort((a, b) => b.avgPercentile - a.avgPercentile);
  }, [cards]);

  // Analyze by card type
  const typeAnalysis = useMemo(() => {
    const stats: Record<string, { cards: CubeCard[]; totalPercentile: number }> = {};
    TYPE_PATTERNS.forEach(type => { stats[type] = { cards: [], totalPercentile: 0 }; });

    cards.forEach(card => {
      const percentile = getPercentile(card.name);
      if (percentile === 0) return;

      TYPE_PATTERNS.forEach(type => {
        if (card.type_line.includes(type)) {
          stats[type].cards.push(card);
          stats[type].totalPercentile += percentile;
        }
      });
    });

    return Object.entries(stats)
      .filter(([_, data]) => data.cards.length > 0)
      .map(([name, data]) => {
        const avgPercentile = data.totalPercentile / data.cards.length;
        const avgElo = data.cards.reduce((sum, c) => sum + (getEloData(c.name)?.elo || 0), 0) / data.cards.length;
        const topCards = data.cards
          .map(c => ({ name: c.name, elo: getEloData(c.name)?.elo || 0, card: c }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 12);

        return { name, count: data.cards.length, avgElo: Math.round(avgElo), avgPercentile: Math.round(avgPercentile), topCards };
      })
      .sort((a, b) => b.avgPercentile - a.avgPercentile);
  }, [cards]);

  // Analyze by CMC
  const cmcAnalysis = useMemo(() => {
    const stats: Record<string, { cards: CubeCard[]; totalPercentile: number }> = {};

    cards.forEach(card => {
      const percentile = getPercentile(card.name);
      if (percentile === 0) return;

      const cmc = Math.min(Math.floor(card.cmc), 7);
      const key = cmc >= 7 ? '7+' : cmc.toString();

      if (!stats[key]) stats[key] = { cards: [], totalPercentile: 0 };
      stats[key].cards.push(card);
      stats[key].totalPercentile += percentile;
    });

    return Object.entries(stats)
      .map(([name, data]) => {
        const avgPercentile = data.totalPercentile / data.cards.length;
        const avgElo = data.cards.reduce((sum, c) => sum + (getEloData(c.name)?.elo || 0), 0) / data.cards.length;
        const topCards = data.cards
          .map(c => ({ name: c.name, elo: getEloData(c.name)?.elo || 0, card: c }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 12);

        return { name: `${name} CMC`, count: data.cards.length, avgElo: Math.round(avgElo), avgPercentile: Math.round(avgPercentile), topCards };
      })
      .sort((a, b) => {
        const cmcA = parseInt(a.name) || 7;
        const cmcB = parseInt(b.name) || 7;
        return cmcA - cmcB;
      });
  }, [cards]);

  // Get top insights
  const insights = useMemo(() => {
    const allMechanics = Object.values(mechanicsAnalysis).flat();
    const sorted = [...allMechanics].sort((a, b) => b.avgPercentile - a.avgPercentile);
    const strong = sorted.filter(m => m.avgPercentile > baselinePercentile + 8).slice(0, 6);
    const weak = sorted.filter(m => m.avgPercentile < baselinePercentile - 8).slice(-6).reverse();
    const totalMechanics = allMechanics.length;
    const avgMechanicsPerCard = allMechanics.reduce((sum, m) => sum + m.count, 0) / cards.length;

    return { strong, weak, totalMechanics, avgMechanicsPerCard, allSorted: sorted };
  }, [mechanicsAnalysis, baselinePercentile, cards.length]);

  const colorValues: Record<string, string> = {
    'White': '#f9fafb', 'Blue': '#3b82f6', 'Black': '#6b7280',
    'Red': '#ef4444', 'Green': '#22c55e', 'Colorless': '#9ca3af', 'Multicolor': '#f59e0b',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Power Analysis</h2>
        <p className="text-white/40 text-sm">
          Understand what makes cards powerful by analyzing mechanics, colors, types, and costs.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat
          label="Cube Baseline"
          value={`${Math.round(baselinePercentile)}%`}
          subtext="avg pick rate"
        />
        <QuickStat
          label="Mechanics Tracked"
          value={insights.totalMechanics.toString()}
          subtext="unique abilities"
        />
        <QuickStat
          label="Strongest"
          value={insights.strong[0]?.name || '-'}
          subtext={`+${(insights.strong[0]?.avgPercentile - baselinePercentile).toFixed(0)}% vs avg`}
          trend="up"
        />
        <QuickStat
          label="Weakest"
          value={insights.weak[0]?.name || '-'}
          subtext={`${(insights.weak[0]?.avgPercentile - baselinePercentile).toFixed(0)}% vs avg`}
          trend="down"
        />
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">High-Value Mechanics</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {insights.strong.map(m => (
              <div key={m.name} className="flex justify-between items-center bg-black/20 rounded-lg px-2 py-1.5">
                <span className="text-xs text-white/80 truncate">{m.name}</span>
                <span className="text-xs font-mono font-bold text-green-400">+{(m.avgPercentile - baselinePercentile).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Lower-Value Mechanics</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {insights.weak.map(m => (
              <div key={m.name} className="flex justify-between items-center bg-black/20 rounded-lg px-2 py-1.5">
                <span className="text-xs text-white/80 truncate">{m.name}</span>
                <span className="text-xs font-mono font-bold text-red-400">{(m.avgPercentile - baselinePercentile).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View Mode Tabs + Sort */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { id: 'ranked', label: 'Ranked List' },
            { id: 'mechanics', label: 'By Category' },
            { id: 'colors', label: 'Colors' },
            { id: 'types', label: 'Types' },
            { id: 'cmc', label: 'Mana Cost' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as typeof viewMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === tab.id
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.04] hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {viewMode === 'mechanics' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">Sort:</span>
            <button
              onClick={() => setSortBy('strength')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                sortBy === 'strength' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Percent className="w-3 h-3" /> Strength
            </button>
            <button
              onClick={() => setSortBy('count')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                sortBy === 'count' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" /> Count
            </button>
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'ranked' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-white">All Mechanics Ranked</h3>
            <p className="text-xs text-white/40 mt-1">Click any mechanic for definition and examples</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {insights.allSorted.map((stat, index) => {
              const delta = stat.avgPercentile - baselinePercentile;
              const isAbove = delta >= 5;
              const isBelow = delta <= -5;
              const isExpanded = expandedMechanic === stat.name;
              const definition = MECHANIC_DEFINITIONS[stat.name];

              return (
                <div key={stat.name}>
                  <button
                    onClick={() => setExpandedMechanic(isExpanded ? null : stat.name)}
                    className={`w-full flex items-center gap-4 px-4 py-2.5 hover:bg-white/[0.02] transition-colors ${
                      isAbove ? 'bg-green-500/[0.03]' : isBelow ? 'bg-red-500/[0.03]' : ''
                    }`}
                  >
                    <span className="text-xs text-white/30 font-mono w-6">{index + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{stat.name}</span>
                        <span className="text-xs text-white/30">{stat.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40">×{stat.count}</span>
                      <span
                        className={`text-sm font-mono font-bold w-14 text-right ${
                          isAbove ? 'text-green-400' : isBelow ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      >
                        {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isAbove ? 'bg-green-500/20 text-green-400' :
                          isBelow ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {isAbove ? 'ABOVE' : isBelow ? 'BELOW' : 'AVG'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 bg-black/20 border-t border-white/[0.04] space-y-4">
                      {/* Definition */}
                      {definition && (
                        <p className="text-sm text-white/70">{definition}</p>
                      )}

                      {/* Stats summary */}
                      <div className="flex gap-4 text-xs">
                        <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                          <div className="text-white/40">Avg ELO</div>
                          <div className="text-white font-mono font-bold">{Math.round(stat.avgElo)}</div>
                        </div>
                        <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                          <div className="text-white/40">Avg Percentile</div>
                          <div className="text-white font-mono font-bold">{stat.avgPercentile}%</div>
                        </div>
                        <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                          <div className="text-white/40">Cards in Cube</div>
                          <div className="text-white font-mono font-bold">{stat.count}</div>
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${
                          isAbove ? 'bg-green-500/10' : isBelow ? 'bg-red-500/10' : 'bg-yellow-500/10'
                        }`}>
                          <div className="text-white/40">vs Baseline</div>
                          <div className={`font-mono font-bold ${
                            isAbove ? 'text-green-400' : isBelow ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {/* Cards with individual stats */}
                      <div>
                        <div className="text-xs text-white/40 mb-3">Top cards with this mechanic:</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                          {stat.topCards.slice(0, 12).map(c => {
                            const cardPercentile = getPercentile(c.name);
                            const cardElo = Math.round(c.elo);
                            return (
                              <CardPreview key={c.name} card={c.card}>
                                <div className="group cursor-pointer">
                                  <div className="relative">
                                    <img
                                      src={getCardImage(c.card)}
                                      alt={c.name}
                                      className="w-full rounded-lg group-hover:ring-2 group-hover:ring-white/30 transition-all"
                                    />
                                    {/* Power badge */}
                                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
                                      c.card.powerLevel >= 9 ? 'bg-amber-400 text-black' :
                                      c.card.powerLevel >= 7 ? 'bg-white/90 text-black' :
                                      'bg-white/20 text-white'
                                    }`}>
                                      {c.card.powerLevel}
                                    </div>
                                  </div>
                                  <div className="mt-1.5 text-center">
                                    <div className="text-[10px] text-white/50 truncate">{c.name}</div>
                                    <div className="flex justify-center gap-2 text-[10px] font-mono">
                                      <span className="text-white/40">{cardElo}</span>
                                      <span className={cardPercentile >= 70 ? 'text-green-400' : cardPercentile >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                                        {cardPercentile}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardPreview>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'mechanics' && (
        <div className="space-y-4">
          {Object.entries(mechanicsAnalysis)
            .sort(([a], [b]) => {
              const order = ['Mana', 'Card Advantage', 'Removal', 'Disruption', 'Combat', 'Protection', 'Recursion', 'Combo', 'Special', 'Enters Play', 'Tokens', 'Planeswalker', 'Keyword'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([category, stats]) => (
              <CategorySection
                key={category}
                category={category}
                stats={stats}
                expanded={expandedSections[category] || false}
                onToggle={() => toggleSection(category)}
                baselinePercentile={baselinePercentile}
                sortBy={sortBy}
              />
            ))}
        </div>
      )}

      {viewMode === 'colors' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colorAnalysis.map(stat => {
            const delta = stat.avgPercentile - baselinePercentile;
            return (
              <div key={stat.name} className={`rounded-xl border p-4 ${getStrengthBg(delta)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorValues[stat.name] }} />
                    <span className="text-sm font-medium text-white">{stat.name}</span>
                    <span className="text-xs text-white/30">({stat.count})</span>
                  </div>
                  <span className="text-sm font-mono font-bold" style={{ color: getStrengthColor(delta) }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${stat.avgPercentile}%`, backgroundColor: colorValues[stat.name] }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {stat.topCards.slice(0, 3).map(card => (
                    <span key={card.name} className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-white/50">
                      {card.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'types' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {typeAnalysis.map(stat => (
            <MechanicRow key={stat.name} stat={stat} baselinePercentile={baselinePercentile} />
          ))}
        </div>
      )}

      {viewMode === 'cmc' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-4">Mana Cost Power Curve</h3>
          <div className="space-y-3">
            {cmcAnalysis.map(stat => (
              <MechanicRow key={stat.name} stat={stat} baselinePercentile={baselinePercentile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
