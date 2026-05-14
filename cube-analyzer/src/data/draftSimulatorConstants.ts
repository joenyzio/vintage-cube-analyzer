/**
 * Draft Simulator Constants
 *
 * All constant values for the draft simulator.
 */

import type { Achievement, DraftStats, AIPlayer } from '../types/draftSimulator';

// =============================================================================
// Draft Configuration
// =============================================================================

export const NUM_PLAYERS = 8;
export const CARDS_PER_PACK = 15;
export const TOTAL_PICKS = 45; // 3 packs * 15 cards

// =============================================================================
// Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
  DRAFT_HISTORY: 'draft-history',
  DRAFT_STATS: 'draft-stats',
  ACHIEVEMENTS: 'draft-achievements',
} as const;

// =============================================================================
// Default Stats
// =============================================================================

export const DEFAULT_DRAFT_STATS: DraftStats = {
  totalDrafts: 0,
  totalPicks: 0,
  avgOptimalRate: 0,
  avgDeckElo: 0,
  bestGrade: '',
  perfectPacks: 0,
  streakOptimal: 0,
  maxStreakOptimal: 0,
  rarePicks: 0,
  quizAccuracy: 0,
  quizTotal: 0,
};

// =============================================================================
// Achievements
// =============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-draft', name: 'First Draft', description: 'Complete your first draft', icon: '🎯', condition: (s) => s.totalDrafts >= 1 },
  { id: 'deck-builder', name: 'Deck Builder', description: 'Complete 5 drafts', icon: '🏗️', condition: (s) => s.totalDrafts >= 5 },
  { id: 'veteran', name: 'Draft Veteran', description: 'Complete 25 drafts', icon: '🎖️', condition: (s) => s.totalDrafts >= 25 },
  { id: 's-tier', name: 'S Tier', description: 'Get an S grade on a draft', icon: '🏆', condition: (s) => s.bestGrade === 'S' },
  { id: 'perfectionist', name: 'Perfectionist', description: '80%+ optimal pick rate', icon: '💎', condition: (s) => s.avgOptimalRate >= 80 },
  { id: 'streak-5', name: 'Hot Streak', description: '5 optimal picks in a row', icon: '🔥', condition: (s) => s.maxStreakOptimal >= 5 },
  { id: 'streak-10', name: 'On Fire', description: '10 optimal picks in a row', icon: '⚡', condition: (s) => s.maxStreakOptimal >= 10 },
  { id: 'gem-hunter', name: 'Gem Hunter', description: 'Pick 10 underrated cards', icon: '💠', condition: (s) => s.rarePicks >= 10 },
  { id: 'quiz-master', name: 'Quiz Master', description: '90%+ quiz accuracy (10+ questions)', icon: '🧠', condition: (s) => s.quizTotal >= 10 && s.quizAccuracy >= 90 },
  { id: 'elite-deck', name: 'Elite Deck', description: 'Build a deck with 1700+ avg ELO', icon: '👑', condition: (s) => s.avgDeckElo >= 1700 },
];

// =============================================================================
// AI Players
// =============================================================================

export const AI_PLAYERS: AIPlayer[] = [
  { name: 'You', colors: [] },
  { name: 'Dimir Drafter', colors: ['U', 'B'] },
  { name: 'Boros Drafter', colors: ['R', 'W'] },
  { name: 'Simic Drafter', colors: ['U', 'G'] },
  { name: 'Rakdos Drafter', colors: ['B', 'R'] },
  { name: 'Azorius Drafter', colors: ['U', 'W'] },
  { name: 'Selesnya Drafter', colors: ['G', 'W'] },
  { name: 'Izzet Drafter', colors: ['U', 'R'] },
];

// =============================================================================
// Archetype Definitions
// =============================================================================

export const ARCHETYPE_DEFINITIONS = {
  'Reanimator': {
    keyCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave', 'Life // Death'],
    enablers: ['Entomb', 'Careful Study', 'Faithless Looting', 'Collective Brutality', 'Putrid Imp', "Oona's Prowler"],
    payoffs: ['Griselbrand', 'Archon of Cruelty', 'Sheoldred, Whispering One', 'Grave Titan', 'Craterhoof Behemoth', 'Emrakul, the Aeons Torn'],
    colors: ['B'],
  },
  'Storm': {
    keyCards: ['Tendrils of Agony', 'Brain Freeze', 'Grapeshot', 'Mind\'s Desire', 'Empty the Warrens'],
    enablers: ['Dark Ritual', 'Cabal Ritual', 'Lion\'s Eye Diamond', 'Lotus Petal', 'Mana Vault', 'Yawgmoth\'s Will'],
    payoffs: ['Tendrils of Agony', 'Brain Freeze', 'Mind\'s Desire'],
    colors: ['U', 'B'],
  },
  'Sneak Attack': {
    keyCards: ['Sneak Attack', 'Through the Breach', 'Show and Tell'],
    enablers: ['Sneak Attack', 'Through the Breach', 'Show and Tell', 'Natural Order'],
    payoffs: ['Emrakul, the Aeons Torn', 'Griselbrand', 'Blightsteel Colossus', 'Craterhoof Behemoth'],
    colors: ['R', 'G'],
  },
  'Artifacts': {
    keyCards: ['Tinker', 'Urza, Lord High Artificer', 'Goblin Welder', 'Daretti, Scrap Savant'],
    enablers: ['Mox Sapphire', 'Mox Ruby', 'Mox Pearl', 'Mox Jet', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Mana Vault'],
    payoffs: ['Blightsteel Colossus', 'Myr Battlesphere', 'Wurmcoil Engine', 'Kaldra Compleat'],
    colors: ['U', 'R'],
  },
  'Aggro': {
    keyCards: ['Ragavan, Nimble Pilferer', 'Monastery Swiftspear', 'Goblin Guide', 'Figure of Destiny'],
    enablers: ['Lightning Bolt', 'Chain Lightning', 'Fireblast'],
    payoffs: ['Sulfuric Vortex', 'Hellrider', 'Embercleave'],
    colors: ['R', 'W'],
  },
  'Control': {
    keyCards: ['Mana Drain', 'Force of Will', 'Counterspell', 'Jace, the Mind Sculptor'],
    enablers: ['Brainstorm', 'Ponder', 'Preordain', 'Snapcaster Mage'],
    payoffs: ['Torrential Gearhulk', 'Consecrated Sphinx', 'The Scarab God'],
    colors: ['U', 'W', 'B'],
  },
  'Ramp': {
    keyCards: ['Channel', 'Rofellos, Llanowar Emissary', 'Gaea\'s Cradle', 'Natural Order'],
    enablers: ['Birds of Paradise', 'Noble Hierarch', 'Llanowar Elves', 'Joraga Treespeaker'],
    payoffs: ['Craterhoof Behemoth', 'Emrakul, the Aeons Torn', 'Ulamog, the Ceaseless Hunger'],
    colors: ['G'],
  },
  'Midrange': {
    keyCards: ['Tarmogoyf', 'Dark Confidant', 'Liliana of the Veil', 'Thoughtseize'],
    enablers: ['Thoughtseize', 'Inquisition of Kozilek', 'Hymn to Tourach'],
    payoffs: ['Grave Titan', 'Sheoldred, the Apocalypse', 'Bloodbraid Elf'],
    colors: ['B', 'G'],
  },
} as const;

// =============================================================================
// Grade Thresholds
// =============================================================================

export const GRADE_THRESHOLDS = {
  S: { minOptimalRate: 90, minDeckElo: 1700 },
  A: { minOptimalRate: 75, minDeckElo: 1600 },
  B: { minOptimalRate: 60, minDeckElo: 1500 },
  C: { minOptimalRate: 45, minDeckElo: 1400 },
  D: { minOptimalRate: 30, minDeckElo: 1300 },
  F: { minOptimalRate: 0, minDeckElo: 0 },
} as const;
