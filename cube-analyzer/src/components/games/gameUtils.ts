/**
 * Shared utilities for all cognitive loop games
 */

import type { CubeCard } from '../../types/card';

// Scoring formula: 100 base + speed bonus + streak bonus
export function calculateScore(
  correct: boolean,
  responseTimeMs: number,
  streak: number,
  maxTimeMs: number
): number {
  if (!correct) return 0;

  const base = 100;

  // Speed bonus: up to 50 points for fast answers
  // Full bonus at 0ms, linear decay to 0 at maxTime
  const speedRatio = Math.max(0, 1 - responseTimeMs / maxTimeMs);
  const speedBonus = Math.round(speedRatio * 50);

  // Streak bonus: 10 points per streak level, capped at 50
  const streakBonus = Math.min(50, streak * 10);

  return base + speedBonus + streakBonus;
}

// Get qualitative summary based on performance
export function getQualitativeSummary(
  correct: number,
  total: number,
  avgTimeMs: number,
  maxTimeMs: number
): string {
  const accuracy = total > 0 ? correct / total : 0;
  const speedRatio = avgTimeMs / maxTimeMs;

  if (accuracy >= 0.9 && speedRatio < 0.5) {
    return "Lightning fast and near-perfect. Your pattern recognition is sharp.";
  }
  if (accuracy >= 0.9) {
    return "Excellent accuracy. Your card knowledge is solid.";
  }
  if (accuracy >= 0.8 && speedRatio < 0.5) {
    return "Fast and accurate. Keep drilling to close the gaps.";
  }
  if (accuracy >= 0.8) {
    return "Good performance. Focus on the cards you missed.";
  }
  if (accuracy >= 0.6) {
    return "Room to improve. The reps will build your intuition.";
  }
  if (accuracy >= 0.4) {
    return "Getting warmed up. Keep practicing to internalize the patterns.";
  }
  return "Early days. Every rep builds your foundation.";
}

// Format time in seconds with 1 decimal
export function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

// Get cards similar to a target (same color or CMC) for distractors
export function getSimilarCards(
  target: CubeCard,
  allCards: CubeCard[],
  count: number
): CubeCard[] {
  const targetColors = target.color_identity || [];
  const targetCmc = target.cmc || 0;

  // Score cards by similarity
  const scored = allCards
    .filter(c => c.id !== target.id)
    .map(card => {
      const cardColors = card.color_identity || [];
      const cardCmc = card.cmc || 0;

      let score = 0;

      // Same color identity is most important
      const sharedColors = cardColors.filter(c => targetColors.includes(c)).length;
      score += sharedColors * 3;

      // Same CMC is good
      if (cardCmc === targetCmc) score += 2;
      else if (Math.abs(cardCmc - targetCmc) === 1) score += 1;

      // Same card type is good
      if (card.type_line && target.type_line) {
        const cardType = card.type_line.split('—')[0].trim().toLowerCase();
        const targetType = target.type_line.split('—')[0].trim().toLowerCase();
        if (cardType === targetType) score += 2;
      }

      return { card, score };
    })
    .sort((a, b) => b.score - a.score);

  // Return top N similar cards
  return scored.slice(0, count).map(s => s.card);
}

// Shuffle array
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get random cards with ELO data
export function getRandomCardsWithElo(
  cards: CubeCard[],
  n: number,
  getEloData: (name: string) => unknown
): CubeCard[] {
  const withElo = cards.filter(c => getEloData(c.name));
  return shuffleArray(withElo).slice(0, n);
}
