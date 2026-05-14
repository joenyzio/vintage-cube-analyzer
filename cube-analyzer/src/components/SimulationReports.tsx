/**
 * Simulation Reports Index
 *
 * Lists available simulation reports and provides comparison view.
 */

import { useState, useMemo } from 'react';
import {
  Users, ArrowRight, BarChart3, AlertTriangle, CheckCircle
} from 'lucide-react';
import { SimulationAnalysis } from './SimulationAnalysis';
import type { CubeCard } from '../types/card';

// Import all simulation data files
import simulation8p from '../data/simulation-data.json';
import simulation6p from '../data/simulation-data-6p.json';

interface SimulationReportsProps {
  cards: CubeCard[];
}

interface SimulationMeta {
  id: string;
  name: string;
  playerCount: number;
  draftCount: number;
  totalDecks: number;
  cardsPerDraft: number;
  undraftedCards: number;
  data: any;
  description: string;
}

// Register available simulations
const SIMULATIONS: SimulationMeta[] = [
  {
    id: '8p',
    name: '8-Player Draft',
    playerCount: 8,
    draftCount: simulation8p.draftCount,
    totalDecks: simulation8p.totalDecks,
    cardsPerDraft: 360,
    undraftedCards: 0,
    data: simulation8p,
    description: 'Standard 8-player draft. All 360 cards are drafted each time.',
  },
  {
    id: '6p',
    name: '6-Player Draft',
    playerCount: 6,
    draftCount: simulation6p.draftCount,
    totalDecks: simulation6p.totalDecks,
    cardsPerDraft: 270,
    undraftedCards: 90,
    data: simulation6p,
    description: '6-player draft. 90 cards go undrafted each time, adding variance.',
  },
];

interface ArchetypeComparison {
  archetype: string;
  '8p': number;
  '6p': number;
}

export function SimulationReports({ cards }: SimulationReportsProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Get archetype data for comparison
  const archetypeComparison = useMemo((): ArchetypeComparison[] => {
    const archetypes = new Set<string>();
    SIMULATIONS.forEach(sim => {
      Object.keys(sim.data.archetypeDistribution).forEach(a => archetypes.add(a));
    });

    return Array.from(archetypes).map(archetype => {
      const data: Record<string, number> = {};
      SIMULATIONS.forEach(sim => {
        const stats = sim.data.archetypeDistribution[archetype];
        data[sim.id] = stats ? (stats.count / sim.totalDecks) * 100 : 0;
      });
      return { archetype, '8p': data['8p'] || 0, '6p': data['6p'] || 0 };
    }).sort((a, b) => b['8p'] - a['8p']);
  }, []);

  // If a report is selected, show that report
  if (selectedReport) {
    const sim = SIMULATIONS.find(s => s.id === selectedReport);
    if (sim) {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedReport(null)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Reports
          </button>
          <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 mb-4">
            <span className="text-white/50">Viewing: </span>
            <span className="text-white font-medium">{sim.name}</span>
            <span className="text-white/50"> • {sim.playerCount} players • {sim.draftCount.toLocaleString()} drafts</span>
          </div>
          <SimulationAnalysis cards={cards} simulationData={sim.data} playerCount={sim.playerCount} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Simulation Reports</h1>
        <p className="text-white/50 mt-1">
          Compare draft simulations across different player counts
        </p>
      </div>

      {/* Available Reports */}
      <div className="grid md:grid-cols-2 gap-6">
        {SIMULATIONS.map(sim => (
          <div
            key={sim.id}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors cursor-pointer"
            onClick={() => setSelectedReport(sim.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{sim.name}</h3>
                <p className="text-sm text-white/50 mt-1">{sim.description}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40 uppercase">Drafts</div>
                <div className="text-xl font-bold text-white">{sim.draftCount.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40 uppercase">Total Decks</div>
                <div className="text-xl font-bold text-white">{sim.totalDecks.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40 uppercase">Cards Used</div>
                <div className="text-xl font-bold text-white">{sim.cardsPerDraft}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40 uppercase">Undrafted</div>
                <div className={`text-xl font-bold ${sim.undraftedCards > 0 ? 'text-amber-400' : 'text-white/50'}`}>
                  {sim.undraftedCards || '—'}
                </div>
              </div>
            </div>

            <button className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors flex items-center justify-center gap-2">
              View Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Archetype Comparison</h3>
          </div>
          <p className="text-sm text-white/50 mt-1">How player count affects archetype distribution</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-sm">
              <th className="text-left p-4 font-medium text-white/50">Archetype</th>
              {SIMULATIONS.map(sim => (
                <th key={sim.id} className="text-right p-4 font-medium text-white/50">
                  {sim.playerCount}p
                </th>
              ))}
              <th className="text-right p-4 font-medium text-white/50">Difference</th>
              <th className="text-left p-4 font-medium text-white/50">Insight</th>
            </tr>
          </thead>
          <tbody>
            {archetypeComparison.map(row => {
              const diff = (row['6p'] || 0) - (row['8p'] || 0);
              const isSignificant = Math.abs(diff) > 2;
              return (
                <tr key={row.archetype} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <span className="font-medium text-white capitalize">{row.archetype}</span>
                  </td>
                  <td className="p-4 text-right text-white/70">{row['8p']?.toFixed(1)}%</td>
                  <td className="p-4 text-right text-white/70">{row['6p']?.toFixed(1)}%</td>
                  <td className="p-4 text-right">
                    <span className={`font-medium ${
                      diff > 2 ? 'text-emerald-400' :
                      diff < -2 ? 'text-red-400' :
                      'text-white/40'
                    }`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white/50">
                    {diff < -4 && 'Less competition with fewer players'}
                    {diff > 2 && 'More viable with fewer players'}
                    {!isSignificant && 'Similar across player counts'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">6-Player vs 8-Player: Key Differences</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-emerald-400 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              What Changes with 6 Players
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400/60">•</span>
                <span><strong className="text-white">Less competition</strong> — only 6 drafters fighting for combo pieces</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400/60">•</span>
                <span><strong className="text-white">90 cards undrafted</strong> — some key combo pieces won't appear each draft</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400/60">•</span>
                <span><strong className="text-white">Combo rates drop ~25%</strong> — Storm 3.5%→2.6%, Reanimator 12.3%→9.3%</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              What Stays the Same
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-amber-400/60">•</span>
                <span><strong className="text-white">Midrange dominates</strong> — 25.5% in 8p, 19.0% in 6p (the "good stuff" fallback)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400/60">•</span>
                <span><strong className="text-white">Combo rates are realistic</strong> — Storm/Sneak/Oath each ~3-6% (1-2 drafters per pod)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400/60">•</span>
                <span><strong className="text-white">Fair decks dominate</strong> — Aggro, Tempo, Control together are ~30% of field</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
