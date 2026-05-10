import { useMemo } from 'react';
import type { CubeCard, Archetype } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { ColorDistributionChart } from './charts/ColorDistributionChart';
import { ManaCurveChart } from './charts/ManaCurveChart';
import {
  getEloData,
  getPercentile,
} from '../services/eloHelpers';
import {
  Play, Zap, Shield, Target, Wand2, Crown,
  TrendingUp, ChevronRight, Sparkles, Skull, Gem, TrendingDown
} from 'lucide-react';

interface OverviewPageProps {
  cards: CubeCard[];
  archetypes: Archetype[];
  colorDistribution: Record<string, number>;
  manaCurve: Record<number, Record<string, number>>;
  typeDistribution: Record<string, number>;
  powerRankings: CubeCard[];
  onNavigate: (tab: string) => void;
}

export function OverviewPage({
  cards,
  archetypes,
  colorDistribution,
  manaCurve,
  typeDistribution,
  powerRankings,
  onNavigate,
}: OverviewPageProps) {
  const stats = useMemo(() => {
    const nonLands = cards.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const avgCmc = nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length;
    const avgPower = cards.reduce((sum, c) => sum + c.powerLevel, 0) / cards.length;

    const fastMana = cards.filter(c => c.role === 'fast_mana');
    const removal = cards.filter(c => c.role === 'removal');
    const counterspells = cards.filter(c => c.role === 'counterspell');
    const tutors = cards.filter(c => c.role === 'tutor');
    const comboPieces = cards.filter(c => c.role === 'combo_piece');
    const finishers = cards.filter(c => c.role === 'finisher' || c.role === 'reanimation_target');

    const power9 = cards.filter(c =>
      ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl', 'Mox Sapphire',
       'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Timetwister'].includes(c.name)
    );

    // Find hidden gems (high ELO but low cube count) and overrated (low ELO but high cube count)
    const cardsWithElo = cards.map(card => {
      const eloData = getEloData(card.name);
      if (!eloData) return null;
      const percentile = getPercentile(card.name);
      // Normalize cube count - higher = more popular
      const avgCubeCount = 30000; // rough average
      const popularityRatio = eloData.cubeCount / avgCubeCount;
      return {
        card,
        elo: eloData.elo,
        percentile,
        cubeCount: eloData.cubeCount,
        pickCount: eloData.pickCount,
        // Hidden gem: high percentile, low popularity
        gemScore: percentile - (popularityRatio * 50),
        // Overrated: low percentile, high popularity
        overratedScore: (popularityRatio * 50) - percentile,
      };
    }).filter(Boolean) as Array<{
      card: CubeCard;
      elo: number;
      percentile: number;
      cubeCount: number;
      pickCount: number;
      gemScore: number;
      overratedScore: number;
    }>;

    const hiddenGems = cardsWithElo
      .filter(c => c.percentile >= 50) // Must be at least decent
      .sort((a, b) => b.gemScore - a.gemScore)
      .slice(0, 5);

    const overrated = cardsWithElo
      .filter(c => c.percentile <= 50) // Below average
      .sort((a, b) => b.overratedScore - a.overratedScore)
      .slice(0, 5);

    return {
      total: cards.length,
      avgCmc: avgCmc.toFixed(2),
      avgPower: avgPower.toFixed(1),
      creatures: typeDistribution.Creature || 0,
      spells: (typeDistribution.Instant || 0) + (typeDistribution.Sorcery || 0),
      lands: typeDistribution.Land || 0,
      fastMana,
      removal,
      counterspells,
      tutors,
      comboPieces,
      finishers,
      power9,
      hiddenGems,
      overrated,
    };
  }, [cards, typeDistribution]);

  const topPicks = powerRankings.slice(0, 8);
  const topArchetypes = archetypes.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Row 1: Key Metrics + Quick Action */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          <MetricCard label="Cards" value={stats.total} />
          <MetricCard label="Avg CMC" value={stats.avgCmc} />
          <MetricCard label="Avg Power" value={`${stats.avgPower}/10`} />
          <MetricCard label="Creatures" value={stats.creatures} />
          <MetricCard label="Spells" value={stats.spells} />
          <MetricCard label="Lands" value={stats.lands} />
        </div>

        <button
          onClick={() => onNavigate('draft')}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 lg:w-auto group active:scale-95"
        >
          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Start Draft
        </button>
      </div>

      {/* Row 2: Top Picks + Role Breakdown */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Top Picks */}
        <div className="lg:col-span-2 bg-black border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Top Picks</h3>
            </div>
            <button
              onClick={() => onNavigate('power')}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors group"
            >
              View all <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
            {topPicks.map((card, idx) => (
              <div
                key={card.id}
                className="relative group cursor-pointer active:scale-95 transition-transform"
                onClick={() => onNavigate('cards')}
              >
                <div className="aspect-[488/680] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform">
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className={`
                  absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg
                  ${idx < 3 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : 'bg-black/80 text-white border border-white/20'}
                `}>
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Breakdown */}
        <div className="bg-black border border-white/[0.06] rounded-xl p-4">
          <h3 className="font-semibold text-white text-sm mb-3">By Role</h3>
          <div className="space-y-2.5">
            <RoleRow icon={Zap} label="Fast Mana" count={stats.fastMana.length} color="text-amber-400" />
            <RoleRow icon={Shield} label="Removal" count={stats.removal.length} color="text-red-400" />
            <RoleRow icon={Wand2} label="Counterspells" count={stats.counterspells.length} color="text-blue-400" />
            <RoleRow icon={Target} label="Tutors" count={stats.tutors.length} color="text-purple-400" />
            <RoleRow icon={Sparkles} label="Combo Pieces" count={stats.comboPieces.length} color="text-emerald-400" />
            <RoleRow icon={Skull} label="Finishers" count={stats.finishers.length} color="text-white/60" />
          </div>

          {stats.power9.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 font-medium">Power 9</span>
                <span className="text-xs font-mono text-amber-400">{stats.power9.length}/9</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full ${i < stats.power9.length ? 'bg-amber-400' : 'bg-white/[0.06]'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Color Balance + Mana Curve */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-black border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">Color Balance</h3>
            <div className="flex gap-3 text-xs">
              {['W', 'U', 'B', 'R', 'G'].map(c => (
                <span key={c} className="text-white/40">
                  {c}: <span className="text-white/70 font-mono">{colorDistribution[c] || 0}</span>
                </span>
              ))}
            </div>
          </div>
          <ColorDistributionChart data={colorDistribution} />
        </div>

        <div className="bg-black border border-white/[0.06] rounded-xl p-4">
          <h3 className="font-semibold text-white text-sm mb-3">Mana Curve</h3>
          <ManaCurveChart data={manaCurve} />
        </div>
      </div>

      {/* Row 4: Top Archetypes */}
      <div className="bg-black border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white/50" />
            </div>
            <h3 className="font-semibold text-white text-sm">Top Archetypes</h3>
          </div>
          <button
            onClick={() => onNavigate('archetypes')}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors group"
          >
            View all <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {topArchetypes.map((arch, idx) => (
            <button
              key={arch.id}
              onClick={() => onNavigate('archetypes')}
              className="flex items-start gap-3 p-3 hover:bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] rounded-xl text-left transition-all duration-200 group"
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                ${idx === 0 ? 'bg-amber-400/10 text-amber-400' : 'bg-white/[0.04] text-white/50'}
              `}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{arch.name}</span>
                  <div className="flex gap-0.5">
                    {arch.colors.map(c => (
                      <div
                        key={c}
                        className={`w-3 h-3 rounded-full
                          ${c === 'W' ? 'bg-amber-100' : ''}
                          ${c === 'U' ? 'bg-blue-500' : ''}
                          ${c === 'B' ? 'bg-neutral-500' : ''}
                          ${c === 'R' ? 'bg-red-500' : ''}
                          ${c === 'G' ? 'bg-green-500' : ''}
                        `}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-1 line-clamp-1">{arch.strategy}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Row 5: Hidden Gems & Overrated */}
      {(stats.hiddenGems.length > 0 || stats.overrated.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Hidden Gems */}
          {stats.hiddenGems.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <Gem className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Hidden Gems</h3>
                  <p className="text-[10px] text-white/40">High ELO, underplayed in other cubes</p>
                </div>
              </div>
              <div className="space-y-2">
                {stats.hiddenGems.map(({ card, percentile, cubeCount }) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => onNavigate('cards')}
                  >
                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0">
                      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{card.name}</div>
                      <div className="text-[10px] text-white/40">{card.type_line?.split('—')[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-400">Top {100 - percentile}%</div>
                      <div className="text-[10px] text-white/30">Only {(cubeCount / 1000).toFixed(1)}k cubes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overrated */}
          {stats.overrated.length > 0 && (
            <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-orange-400/10 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Potentially Overrated</h3>
                  <p className="text-[10px] text-white/40">Popular but lower ELO than expected</p>
                </div>
              </div>
              <div className="space-y-2">
                {stats.overrated.map(({ card, percentile, cubeCount }) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => onNavigate('cards')}
                  >
                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0">
                      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{card.name}</div>
                      <div className="text-[10px] text-white/40">{card.type_line?.split('—')[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-orange-400">Top {100 - percentile}%</div>
                      <div className="text-[10px] text-white/30">In {(cubeCount / 1000).toFixed(1)}k cubes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 6: Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction icon={Sparkles} label="Build Around" onClick={() => onNavigate('buildaround')} />
        <QuickAction icon={Target} label="Synergies" onClick={() => onNavigate('synergies')} />
        <QuickAction icon={Shield} label="Matchups" onClick={() => onNavigate('matchups')} />
        <QuickAction icon={Crown} label="Sample Decks" onClick={() => onNavigate('decks')} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4 text-center">
      <div className="text-xl sm:text-lg font-semibold text-white">{value}</div>
      <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

function RoleRow({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <span className="text-sm font-mono text-white tabular-nums">{count}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-black border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all group"
    >
      <div className="w-9 h-9 bg-white/[0.04] rounded-lg flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
        <Icon className="w-4 h-4 text-white/50 group-hover:text-white/70 transition-colors" />
      </div>
      <span className="font-medium text-white text-sm">{label}</span>
    </button>
  );
}
