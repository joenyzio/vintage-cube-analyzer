/**
 * Dashboard Page - Personal Drafter Home
 *
 * The landing page focused on YOU as a drafter, not cube stats.
 * Quick actions, recommendations, and draft prep.
 */

import { useState } from 'react';
import {
  Play, Target, TrendingUp, Zap, BookOpen,
  ChevronRight, AlertTriangle, Star, Layers, Dices, ArrowRight, Search
} from 'lucide-react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import simulationData from '../data/simulation-data.json';

interface Props {
  cards: CubeCard[];
  onNavigate: (tab: string) => void;
  onStartDraft: () => void;
}

// Load draft history from localStorage
function getDraftHistory(): { date: string; archetype: string; elo: number; picks: number }[] {
  try {
    const stored = localStorage.getItem('draftHistory');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Get top archetypes from simulation data
function getTopArchetypes() {
  const archetypes = simulationData.archetypeDistribution as Record<string, { count: number; avgDeckQuality: number }>;
  return Object.entries(archetypes)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.avgDeckQuality - a.avgDeckQuality)
    .slice(0, 5);
}

// Key cards to watch for in P1P1
function getKeyCards(cards: CubeCard[]): CubeCard[] {
  const keyCardNames = [
    'Oath of Druids', 'Sneak Attack', 'Show and Tell', 'Entomb', 'Reanimate',
    'Tinker', 'Time Vault', 'Channel', 'Natural Order', "Yawgmoth's Will",
    'Black Lotus', 'Ancestral Recall', 'Time Walk'
  ];
  return cards.filter(c => keyCardNames.includes(c.name)).slice(0, 8);
}

export function DashboardPage({ cards, onNavigate, onStartDraft }: Props) {
  const [draftHistory] = useState(getDraftHistory);
  const topArchetypes = getTopArchetypes();
  const keyCards = getKeyCards(cards);

  // Calculate stats from history
  const totalDrafts = draftHistory.length;
  const avgElo = totalDrafts > 0
    ? Math.round(draftHistory.reduce((sum, d) => sum + d.elo, 0) / totalDrafts)
    : 0;

  // Get current time for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Hero Section - Clean, minimal */}
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">{greeting}</h1>
          <p className="text-white/40 mb-6">Ready to draft?</p>

          <button
            onClick={onStartDraft}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:bg-white/15 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            Start Draft
          </button>
        </div>
      </div>

      {/* First-Time User Welcome OR Quick Stats */}
      {totalDrafts === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Getting Started</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={onStartDraft}
              className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Practice Draft</div>
                <div className="text-xs text-white/40">Learn by doing</div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </button>
            <button
              onClick={() => onNavigate('archetypes')}
              className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Archetypes</div>
                <div className="text-xs text-white/40">Learn the decks</div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </button>
            <button
              onClick={() => onNavigate('games')}
              className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Dices className="w-5 h-5 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Training Games</div>
                <div className="text-xs text-white/40">Build skills</div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{totalDrafts}</div>
            <div className="text-xs text-white/30 uppercase tracking-wider">Drafts</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{avgElo}</div>
            <div className="text-xs text-white/30 uppercase tracking-wider">Avg ELO</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold text-white truncate">
              {draftHistory[0]?.archetype || '-'}
            </div>
            <div className="text-xs text-white/30 uppercase tracking-wider">Last Deck</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold text-white">
              {draftHistory[0]?.elo || '-'}
            </div>
            <div className="text-xs text-white/30 uppercase tracking-wider">Last ELO</div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Draft Strategy */}
        <div className="space-y-6">
          {/* Top Archetypes */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-white/40" />
                <h2 className="font-medium text-white">Top Archetypes</h2>
              </div>
              <button
                onClick={() => onNavigate('odds')}
                className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {topArchetypes.map((arch, i) => (
                <div key={arch.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-white/[0.06] text-white/50">
                      {i + 1}
                    </span>
                    <span className="text-white/80 capitalize">{arch.id.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-white/40 text-sm font-mono">{arch.avgDeckQuality}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Tips */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-white/40" />
              <h2 className="font-medium text-white">Quick Tips</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">1.</span>
                <span>P1P1: Take combo enablers (Oath, Sneak, Entomb) over raw power</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">2.</span>
                <span>Oath lacks Forbidden Orchard - matchup dependent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">3.</span>
                <span>Sultai Midrange (1908 ELO) beats other fair decks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">4.</span>
                <span>Storm has only 9 cards in cube - high variance</span>
              </li>
            </ul>
          </div>

          {/* Remember */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-white/40" />
              <h2 className="font-medium text-white text-sm">Remember</h2>
            </div>
            <ul className="space-y-1.5 text-xs text-white/40">
              <li>Avg Card Power ≠ Win Rate</li>
              <li>Combo decks need ALL pieces</li>
              <li>Have a pivot plan ready</li>
            </ul>
          </div>
        </div>

        {/* Right: Cards & Actions */}
        <div className="space-y-6">
          {/* Key Cards to Watch */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-white/40" />
                <h2 className="font-medium text-white">P1P1 Watch List</h2>
              </div>
              <button
                onClick={() => onNavigate('power')}
                className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                Rankings <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {keyCards.map(card => (
                  <div key={card.id} className="relative group">
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-1">
                      <span className="text-[10px] text-white text-center leading-tight">{card.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-3">
                See these P1P1? Commit to the archetype.
              </p>
            </div>
          </div>

          {/* Quick Links - Uniform styling */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('odds')}
              className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-left hover:bg-white/[0.04] transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-sm font-medium text-white/80">Draft Odds</div>
                <div className="text-xs text-white/30">Archetype analysis</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('synergies')}
              className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-left hover:bg-white/[0.04] transition-colors"
            >
              <Layers className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-sm font-medium text-white/80">Synergies</div>
                <div className="text-xs text-white/30">Card combos</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('guide')}
              className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-left hover:bg-white/[0.04] transition-colors"
            >
              <BookOpen className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-sm font-medium text-white/80">Draft Guide</div>
                <div className="text-xs text-white/30">Strategy tips</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('cards')}
              className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-left hover:bg-white/[0.04] transition-colors"
            >
              <Search className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-sm font-medium text-white/80">Card Browser</div>
                <div className="text-xs text-white/30">Search all cards</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
