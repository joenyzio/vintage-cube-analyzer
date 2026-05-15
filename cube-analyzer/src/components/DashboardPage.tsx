/**
 * Dashboard Page - Personal Drafter Home
 *
 * The landing page focused on YOU as a drafter, not cube stats.
 * Quick actions, recommendations, and draft prep.
 */

import { useState } from 'react';
import {
  Play, Target, TrendingUp, Clock, Zap, BookOpen,
  ChevronRight, AlertTriangle, Star, Layers
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
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent border border-white/10 p-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">{greeting}, Drafter</h1>
          <p className="text-white/50 mb-6">Ready to draft the Vintage Cube?</p>

          <button
            onClick={onStartDraft}
            className="inline-flex items-center gap-3 px-6 py-4 bg-white text-black rounded-xl font-semibold text-lg hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            Start Draft
          </button>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Quick Stats */}
      {totalDrafts > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{totalDrafts}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Drafts</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{avgElo}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Avg ELO</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">
              {draftHistory[0]?.archetype || '-'}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Last Deck</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">
              {draftHistory[0]?.elo || '-'}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Last ELO</div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Draft Strategy */}
        <div className="space-y-6">
          {/* Top Archetypes */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">Top Archetypes</h2>
              </div>
              <button
                onClick={() => onNavigate('odds')}
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {topArchetypes.map((arch, i) => (
                <div key={arch.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-white capitalize">{arch.id.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-white/50 text-sm font-mono">{arch.avgDeckQuality} ELO</span>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Tips */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-white">Quick Tips</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">1.</span>
                <span>P1P1: Take combo enablers (Oath, Sneak, Entomb) over raw power</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">2.</span>
                <span>Oath lacks Forbidden Orchard - matchup dependent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">3.</span>
                <span>Sultai Midrange (1908 ELO) beats other fair decks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">4.</span>
                <span>Storm has only 9 cards in cube - high variance</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Cards & Actions */}
        <div className="space-y-6">
          {/* Key Cards to Watch */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-white">P1P1 Watch List</h2>
              </div>
              <button
                onClick={() => onNavigate('power')}
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
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
                      className="w-full rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-1">
                      <span className="text-[10px] text-white text-center leading-tight">{card.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-3">
                See these P1P1? Commit to the archetype.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('odds')}
              className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-left hover:bg-purple-500/20 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-sm font-medium text-white">Draft Odds</div>
                <div className="text-xs text-white/40">Archetype analysis</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('synergies')}
              className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-left hover:bg-green-500/20 transition-colors"
            >
              <Layers className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-medium text-white">Synergies</div>
                <div className="text-xs text-white/40">Card combos</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('guide')}
              className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-left hover:bg-blue-500/20 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-sm font-medium text-white">Draft Guide</div>
                <div className="text-xs text-white/40">Strategy tips</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate('cards')}
              className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors"
            >
              <Clock className="w-5 h-5 text-white/50" />
              <div>
                <div className="text-sm font-medium text-white">Card Browser</div>
                <div className="text-xs text-white/40">Search all cards</div>
              </div>
            </button>
          </div>

          {/* Critical Warnings */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="font-semibold text-white text-sm">Remember</h2>
            </div>
            <ul className="space-y-1.5 text-xs text-white/60">
              <li>Avg Card Power ≠ Win Rate</li>
              <li>Combo decks need ALL pieces</li>
              <li>Have a pivot plan ready</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
