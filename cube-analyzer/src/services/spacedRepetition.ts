/**
 * Spaced Repetition Engine
 *
 * Based on SM-2 algorithm. Tracks learning progress across all training modes.
 * Items you get wrong come back quickly. Items you get right space out over time.
 */

export interface ReviewItem {
  id: string;           // Unique identifier (card name, scenario hash, etc.)
  category: SkillCategory;
  easeFactor: number;   // Difficulty multiplier (starts at 2.5)
  interval: number;     // Days until next review
  repetitions: number;  // Successful reviews in a row
  nextReview: number;   // Timestamp of next scheduled review
  lastReview: number;   // Timestamp of last review
  totalReviews: number; // All-time review count
  correctCount: number; // All-time correct count
}

export type SkillCategory =
  | 'card-evaluation'
  | 'pack-picks'
  | 'mulligans'
  | 'signals'
  | 'archetypes'
  | 'sideboard'
  | 'sequencing'
  | 'matchups';

export interface SkillRating {
  category: SkillCategory;
  elo: number;          // ELO-style rating (starts at 1200)
  percentile: number;   // Calculated percentile
  totalAttempts: number;
  recentAccuracy: number; // Last 20 attempts
  trend: 'improving' | 'stable' | 'declining';
}

export interface MistakePattern {
  pattern: string;      // Description of the mistake type
  category: SkillCategory;
  frequency: number;    // How often this mistake occurs
  examples: string[];   // Specific instances
  lastOccurred: number;
}

const STORAGE_KEY = 'cube-mastery-srs';
const SKILL_RATINGS_KEY = 'cube-mastery-skills';
const MISTAKES_KEY = 'cube-mastery-mistakes';

// SM-2 algorithm constants
const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;
const INITIAL_INTERVAL = 1; // 1 day

/**
 * Quality ratings for SM-2
 * 0 - Complete failure
 * 1 - Wrong, but recognized correct answer
 * 2 - Wrong, but felt close
 * 3 - Correct with difficulty
 * 4 - Correct with hesitation
 * 5 - Perfect recall
 */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

// Load/save functions
function loadItems(): Map<string, ReviewItem> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return new Map(Object.entries(parsed));
    }
  } catch {}
  return new Map();
}

function saveItems(items: Map<string, ReviewItem>) {
  try {
    const obj = Object.fromEntries(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

function loadSkillRatings(): Map<SkillCategory, SkillRating> {
  try {
    const saved = localStorage.getItem(SKILL_RATINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return new Map(Object.entries(parsed) as [SkillCategory, SkillRating][]);
    }
  } catch {}

  // Initialize default ratings
  const defaults = new Map<SkillCategory, SkillRating>();
  const categories: SkillCategory[] = [
    'card-evaluation', 'pack-picks', 'mulligans', 'signals',
    'archetypes', 'sideboard', 'sequencing', 'matchups'
  ];

  for (const cat of categories) {
    defaults.set(cat, {
      category: cat,
      elo: 1200,
      percentile: 50,
      totalAttempts: 0,
      recentAccuracy: 0,
      trend: 'stable'
    });
  }

  return defaults;
}

function saveSkillRatings(ratings: Map<SkillCategory, SkillRating>) {
  try {
    const obj = Object.fromEntries(ratings);
    localStorage.setItem(SKILL_RATINGS_KEY, JSON.stringify(obj));
  } catch {}
}

function loadMistakes(): MistakePattern[] {
  try {
    const saved = localStorage.getItem(MISTAKES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveMistakes(mistakes: MistakePattern[]) {
  try {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
  } catch {}
}

/**
 * Calculate next review interval using SM-2 algorithm
 */
function calculateNextReview(item: ReviewItem, quality: Quality): ReviewItem {
  const now = Date.now();

  // If quality < 3, reset repetitions (failed recall)
  if (quality < 3) {
    return {
      ...item,
      repetitions: 0,
      interval: 1, // Review again in 1 day (or sooner for same-session)
      nextReview: now + (quality === 0 ? 1000 * 60 * 5 : 1000 * 60 * 30), // 5 or 30 mins
      lastReview: now,
      totalReviews: item.totalReviews + 1,
      // Don't update correctCount for failures
    };
  }

  // Successful recall
  let newInterval: number;
  let newRepetitions = item.repetitions + 1;

  if (newRepetitions === 1) {
    newInterval = 1; // 1 day
  } else if (newRepetitions === 2) {
    newInterval = 6; // 6 days
  } else {
    newInterval = Math.round(item.interval * item.easeFactor);
  }

  // Adjust ease factor based on quality
  const newEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    ...item,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: now + newInterval * 24 * 60 * 60 * 1000,
    lastReview: now,
    totalReviews: item.totalReviews + 1,
    correctCount: item.correctCount + 1,
  };
}

/**
 * Update ELO rating based on performance
 */
function updateElo(current: number, expected: number, actual: number, k: number = 32): number {
  return current + k * (actual - expected);
}

/**
 * Main SRS class
 */
class SpacedRepetitionSystem {
  private items: Map<string, ReviewItem>;
  private skillRatings: Map<SkillCategory, SkillRating>;
  private mistakes: MistakePattern[];
  private recentResults: Map<SkillCategory, boolean[]>; // Track last 20 per category

  constructor() {
    this.items = loadItems();
    this.skillRatings = loadSkillRatings();
    this.mistakes = loadMistakes();
    this.recentResults = new Map();
  }

  /**
   * Record a review result
   */
  recordReview(
    id: string,
    category: SkillCategory,
    quality: Quality,
    mistakeType?: string,
    mistakeExample?: string
  ) {
    // Get or create item
    let item = this.items.get(id) || {
      id,
      category,
      easeFactor: INITIAL_EASE_FACTOR,
      interval: INITIAL_INTERVAL,
      repetitions: 0,
      nextReview: Date.now(),
      lastReview: 0,
      totalReviews: 0,
      correctCount: 0,
    };

    // Update item with SM-2
    item = calculateNextReview(item, quality);
    this.items.set(id, item);
    saveItems(this.items);

    // Update skill rating
    const correct = quality >= 3;
    this.updateSkillRating(category, correct);

    // Track recent results
    if (!this.recentResults.has(category)) {
      this.recentResults.set(category, []);
    }
    const recent = this.recentResults.get(category)!;
    recent.push(correct);
    if (recent.length > 20) recent.shift();

    // Track mistake patterns
    if (!correct && mistakeType) {
      this.recordMistake(category, mistakeType, mistakeExample);
    }
  }

  /**
   * Update skill rating using ELO-like system
   */
  private updateSkillRating(category: SkillCategory, correct: boolean) {
    const rating = this.skillRatings.get(category)!;

    // Expected score based on current ELO (assuming 1200 = 50% expected)
    const expected = 1 / (1 + Math.pow(10, (1200 - rating.elo) / 400));
    const actual = correct ? 1 : 0;

    // Update ELO
    const newElo = updateElo(rating.elo, expected, actual);

    // Calculate recent accuracy
    const recent = this.recentResults.get(category) || [];
    const recentAccuracy = recent.length > 0
      ? recent.filter(r => r).length / recent.length
      : 0;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recent.length >= 10) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const firstAcc = firstHalf.filter(r => r).length / firstHalf.length;
      const secondAcc = secondHalf.filter(r => r).length / secondHalf.length;
      if (secondAcc - firstAcc > 0.1) trend = 'improving';
      else if (firstAcc - secondAcc > 0.1) trend = 'declining';
    }

    // Calculate percentile (rough approximation)
    // ELO 1000 = 20th percentile, 1200 = 50th, 1400 = 80th, 1600 = 95th
    const percentile = Math.min(99, Math.max(1,
      50 + (newElo - 1200) * 0.15
    ));

    this.skillRatings.set(category, {
      ...rating,
      elo: Math.round(newElo),
      percentile: Math.round(percentile),
      totalAttempts: rating.totalAttempts + 1,
      recentAccuracy: Math.round(recentAccuracy * 100),
      trend,
    });

    saveSkillRatings(this.skillRatings);
  }

  /**
   * Record a mistake pattern
   */
  private recordMistake(category: SkillCategory, pattern: string, example?: string) {
    const existing = this.mistakes.find(m => m.pattern === pattern && m.category === category);

    if (existing) {
      existing.frequency++;
      existing.lastOccurred = Date.now();
      if (example && !existing.examples.includes(example)) {
        existing.examples.push(example);
        if (existing.examples.length > 5) existing.examples.shift();
      }
    } else {
      this.mistakes.push({
        pattern,
        category,
        frequency: 1,
        examples: example ? [example] : [],
        lastOccurred: Date.now(),
      });
    }

    saveMistakes(this.mistakes);
  }

  /**
   * Get items due for review
   */
  getDueItems(category?: SkillCategory, limit: number = 10): ReviewItem[] {
    const now = Date.now();
    const due: ReviewItem[] = [];

    for (const item of this.items.values()) {
      if (category && item.category !== category) continue;
      if (item.nextReview <= now) {
        due.push(item);
      }
    }

    // Sort by most overdue first
    due.sort((a, b) => a.nextReview - b.nextReview);

    return due.slice(0, limit);
  }

  /**
   * Get skill ratings
   */
  getSkillRatings(): SkillRating[] {
    return Array.from(this.skillRatings.values());
  }

  /**
   * Get skill rating for a category
   */
  getSkillRating(category: SkillCategory): SkillRating {
    return this.skillRatings.get(category)!;
  }

  /**
   * Get top mistake patterns
   */
  getTopMistakes(limit: number = 5): MistakePattern[] {
    return [...this.mistakes]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get mistakes for a category
   */
  getMistakesByCategory(category: SkillCategory): MistakePattern[] {
    return this.mistakes
      .filter(m => m.category === category)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get overall mastery level
   */
  getOverallMastery(): { elo: number; percentile: number; strengths: SkillCategory[]; weaknesses: SkillCategory[] } {
    const ratings = this.getSkillRatings();
    const avgElo = ratings.reduce((sum, r) => sum + r.elo, 0) / ratings.length;
    const avgPercentile = ratings.reduce((sum, r) => sum + r.percentile, 0) / ratings.length;

    const sorted = [...ratings].sort((a, b) => b.elo - a.elo);
    const strengths = sorted.slice(0, 2).map(r => r.category);
    const weaknesses = sorted.slice(-2).map(r => r.category);

    return {
      elo: Math.round(avgElo),
      percentile: Math.round(avgPercentile),
      strengths,
      weaknesses,
    };
  }

  /**
   * Check if an item exists
   */
  hasItem(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Get item stats
   */
  getItemStats(id: string): ReviewItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get total items reviewed
   */
  getTotalReviews(): number {
    let total = 0;
    for (const item of this.items.values()) {
      total += item.totalReviews;
    }
    return total;
  }

  /**
   * Reset all data (for testing)
   */
  reset() {
    this.items.clear();
    this.skillRatings = loadSkillRatings(); // Reset to defaults
    this.mistakes = [];
    this.recentResults.clear();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SKILL_RATINGS_KEY);
    localStorage.removeItem(MISTAKES_KEY);
  }
}

// Export singleton instance
export const srs = new SpacedRepetitionSystem();

// Helper to convert boolean to quality
export function boolToQuality(correct: boolean, confident: boolean = true): Quality {
  if (correct) {
    return confident ? 5 : 4;
  } else {
    return confident ? 1 : 2; // Confident but wrong vs uncertain and wrong
  }
}
