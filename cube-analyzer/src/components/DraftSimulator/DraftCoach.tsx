/**
 * Draft Coach Component
 *
 * The left sidebar during active drafts showing recommendations,
 * archetype tracking, signals, and deck stats.
 */

// React is used for JSX
import { Lightbulb } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { DraftState, DraftPhase, CurveAnalysis } from '../../types/draftSimulator';

// Local type for win rate data (matches what main component uses)
interface DeckWinRateData {
  winRate: number;
  grade: string;
  confidence: string;
  factors: { name: string; impact: number; description: string }[];
}
import { getCardImage } from '../../services/scryfall';
import { getArchetypeContext, getColorAdvice, getBestVariant } from '../../services/simulationInsights';
import {
  analyzePackComposition,
  findSynergies,
  analyzeViablePaths,
  projectFinalDeck,
  quantifySignals,
  planPickSequence,
} from '../../services/cardRating';

interface ArchetypeCommitment {
  archetype: string;
  probability: number;
  keyCardsOwned: string[];
  keyCardsMissing: string[];
  criticalMass: { current: number; needed: number; category: string }[];
}

interface DraftSignals {
  colorsCut: { color: string; intensity: number }[];
  colorsOpen: { color: string; confidence: number }[];
  lateSignals: { card: CubeCard; pick: number; pack: number; colors: string[] }[];
  rightNeighborColors: string[];
  leftNeighborColors: string[];
}

interface EnablerPayoffBalance {
  archetype: string;
  enablers: { card: CubeCard; role: string }[];
  payoffs: { card: CubeCard; role: string }[];
  balance: 'needs-enablers' | 'needs-payoffs' | 'balanced' | 'not-applicable';
  recommendation: string;
}

interface ManaBaseStatus {
  colorsNeeded: { color: string; sources: number; cardsRequiring: number }[];
  fixingCards: CubeCard[];
  splashViability: { color: string; viable: boolean; reason: string }[];
  recommendation: string;
}

interface CoachExplanation {
  card: CubeCard;
  elo: number;
  percentile: number;
  reasons: string[];
  mainReason: string;
  alternatives: { name: string; score: number; reason: string }[];
  deckNeeds: string[];
  currentArchetype: string;
}

interface DraftCoachProps {
  draftState: DraftState;
  coachMode: boolean;
  quizDraftMode: boolean;
  showPickReveal: boolean;
  showCoachExplanation: boolean;
  coachExplanation: CoachExplanation | null;
  draftPhase: { phase: DraftPhase; description: string; priority: string } | null;
  archetypeCommitments: ArchetypeCommitment[];
  draftSignals: DraftSignals | null;
  enablerPayoffBalance: EnablerPayoffBalance[];
  manaBaseStatus: ManaBaseStatus | null;
  curveAnalysis: CurveAnalysis | null;
  deckWinRate: DeckWinRateData | null;
  colorCounts: Record<string, number>;
  deckStats: { creatures: number; spells: number; lands: number; avgCmc: number } | null;
  topRegrets: { card: CubeCard; passedAt: number; whyRegret: string }[];
  progress: number;
  onToggleCoachExplanation: () => void;
  onHoverCard: (card: CubeCard) => void;
}

export function DraftCoach({
  draftState,
  coachMode,
  quizDraftMode,
  showPickReveal,
  showCoachExplanation,
  coachExplanation,
  draftPhase,
  archetypeCommitments,
  draftSignals,
  enablerPayoffBalance,
  manaBaseStatus,
  curveAnalysis,
  deckWinRate,
  colorCounts,
  deckStats,
  topRegrets,
  progress,
  onToggleCoachExplanation,
  onHoverCard,
}: DraftCoachProps) {
  // Get current pack (player 0's pack from tablePacks)
  const currentPack = draftState.tablePacks?.[0] || [];

  // Analyze current pack for strategic insights
  const packAnalysis = currentPack.length > 0
    ? analyzePackComposition(currentPack)
    : null;

  // Get pool synergies
  const poolSynergies = draftState.picks.length >= 2
    ? findSynergies(draftState.picks)
    : [];

  // Analyze viable paths
  const viablePaths = draftState.picks.length >= 3
    ? analyzeViablePaths(draftState.picks, colorCounts)
    : [];

  // Project final deck
  const deckProjection = draftState.picks.length >= 8
    ? projectFinalDeck(draftState.picks, colorCounts, draftState.picks.length)
    : null;

  // Signal strengths
  const signalStrengths = draftState.picks.length >= 5
    ? quantifySignals(draftState.passedCards, draftState.seenCards, draftState.picks.length)
    : [];

  // Pick sequence lookahead (find top card from pack)
  const topCard = currentPack.length > 0 ? currentPack[0] : null; // Simplified - ideally use rated top
  const pickSequence = topCard && draftState.picks.length >= 1
    ? planPickSequence(currentPack, draftState.picks, topCard)
    : null;

  return (
    <div className="w-[320px] flex-shrink-0 hidden lg:flex flex-col bg-white/[0.02] border-r border-white/[0.08]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Pack Analysis - Shows throughout draft */}
        {coachMode && packAnalysis && currentPack.length > 0 && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-blue-400/80 uppercase tracking-wider font-medium">Pack Intel</div>

            {/* Color concentration */}
            {packAnalysis.dominantColors.length > 0 && (
              <div className="text-xs text-white/60">
                <span className="text-white/40">Heavy in: </span>
                {packAnalysis.dominantColors.map(c => {
                  const colorName: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
                  return colorName[c] || c;
                }).join(', ')}
                <span className="text-white/30 ml-1">(3+ cards)</span>
              </div>
            )}

            {/* Archetype signals */}
            {packAnalysis.archetypeSignals.length > 0 && (
              <div className="text-xs text-white/60">
                <span className="text-white/40">Signals: </span>
                {packAnalysis.archetypeSignals.slice(0, 2).map((s, i) => (
                  <span key={s.archetypeId}>
                    {i > 0 && ', '}
                    <span className="text-purple-400/80">{s.archetypeId}</span>
                    <span className="text-white/30"> ({s.cardCount})</span>
                  </span>
                ))}
              </div>
            )}

            {/* Likely wheels */}
            {packAnalysis.likelyWheels.length > 0 && packAnalysis.likelyWheels.length <= 5 && (
              <div className="text-xs text-white/50">
                <span className="text-white/40">May wheel: </span>
                {packAnalysis.likelyWheels.slice(0, 3).join(', ')}
              </div>
            )}

            {/* Power level */}
            <div className="text-xs">
              <span className="text-white/40">Pack power: </span>
              <span className={
                packAnalysis.powerConcentration === 'high' ? 'text-amber-400' :
                packAnalysis.powerConcentration === 'low' ? 'text-red-400/60' :
                'text-white/50'
              }>
                {packAnalysis.powerConcentration}
              </span>
            </div>
          </div>
        )}

        {/* Pool Synergies - Shows when you have combos */}
        {coachMode && poolSynergies.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-green-400/80 uppercase tracking-wider font-medium">Active Synergies</div>
            {poolSynergies.slice(0, 3).map((syn, i) => (
              <div key={i} className="text-xs">
                <span className="text-green-400">{syn.card1}</span>
                <span className="text-white/30"> + </span>
                <span className="text-green-400">{syn.card2}</span>
                <span className="text-white/50 ml-2">{syn.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Viable Paths - Shows draft direction options */}
        {coachMode && viablePaths.length > 0 && draftState.picks.length >= 5 && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-purple-400/80 uppercase tracking-wider font-medium">Draft Paths</div>
            {viablePaths.slice(0, 3).map((path, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${path.probability >= 0.6 ? 'text-green-400' : path.probability >= 0.4 ? 'text-amber-400' : 'text-white/50'}`}>
                    {path.archetype}
                  </span>
                  <span className="text-white/30">{Math.round(path.probability * 100)}%</span>
                </div>
                {path.keyCardsNeeded.length > 0 && (
                  <div className="text-white/40 mt-0.5">
                    Need: {path.keyCardsNeeded.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Signal Strengths - How open each archetype is */}
        {coachMode && signalStrengths.length > 0 && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-cyan-400/80 uppercase tracking-wider font-medium">Lane Openness</div>
            {signalStrengths.filter(s => s.openness > 0.5 || s.openness < 0.4).slice(0, 4).map((signal, i) => (
              <div key={i} className="text-xs flex items-center justify-between">
                <span className="text-white/70">{signal.archetypeId}</span>
                <span className={`font-medium ${
                  signal.openness >= 0.7 ? 'text-green-400' :
                  signal.openness >= 0.5 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {signal.openness >= 0.7 ? 'Wide Open' :
                   signal.openness >= 0.5 ? 'Open' :
                   'Contested'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Deck Projection - What your final deck looks like */}
        {coachMode && deckProjection && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
            <div className="text-xs text-amber-400/80 uppercase tracking-wider font-medium">Deck Projection</div>
            <div className="text-xs">
              <span className="text-white/70">{deckProjection.projectedArchetype}</span>
              <span className="text-white/30 ml-2">~{deckProjection.estimatedElo} ELO</span>
            </div>
            {deckProjection.strengths.length > 0 && (
              <div className="text-xs text-green-400/70">
                + {deckProjection.strengths.slice(0, 2).join(', ')}
              </div>
            )}
            {deckProjection.weaknesses.length > 0 && (
              <div className="text-xs text-red-400/70">
                - {deckProjection.weaknesses.slice(0, 2).join(', ')}
              </div>
            )}
            {deckProjection.cardsNeeded.length > 0 && (
              <div className="text-xs text-white/40">
                Prioritize: {deckProjection.cardsNeeded.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Pick Sequence - Multi-pick lookahead */}
        {coachMode && pickSequence && pickSequence.likelyWheel.length > 0 && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 space-y-1">
            <div className="text-xs text-indigo-400/80 uppercase tracking-wider font-medium">Pick Plan</div>
            <div className="text-xs text-white/60">{pickSequence.narrative}</div>
          </div>
        )}

        {/* Coach Panel - Spacious design */}
        {(coachMode || (quizDraftMode && showPickReveal)) && coachExplanation && (
          <div className="space-y-4">
            <button
              onClick={onToggleCoachExplanation}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-white/50" />
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Recommended</span>
              </div>
              <span className="text-white/30 text-sm">{showCoachExplanation ? '−' : '+'}</span>
            </button>

            <div className="space-y-4">
              {/* Main Pick Recommendation */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                  <img src={getCardImage(coachExplanation.card)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-white">{coachExplanation.card.name}</div>
                  <div className="text-sm text-white/40 font-mono">{Math.round(coachExplanation.elo)} ELO</div>
                  <div className="mt-1 text-sm text-white/60 leading-snug">
                    {coachExplanation.mainReason}
                  </div>
                </div>
              </div>

              {/* Current Archetype with Emergence and Color Advice */}
              {coachExplanation.currentArchetype && (
                <div className="space-y-2">
                  <div className="text-sm text-white/40">
                    Building: <span className="text-white/70 font-medium">{coachExplanation.currentArchetype}</span>
                  </div>
                  {(() => {
                    const archetypeId = coachExplanation.currentArchetype.toLowerCase();
                    const context = getArchetypeContext(archetypeId);
                    const currentColors = Object.keys(colorCounts).filter(c => colorCounts[c] > 0);
                    const colorAdvice = getColorAdvice(archetypeId, currentColors);
                    const bestVariant = getBestVariant(archetypeId);

                    return (
                      <>
                        {context && (
                          <div className="text-xs text-white/30 italic">
                            {context}
                          </div>
                        )}
                        {bestVariant && (
                          <div className="text-xs text-purple-400/80">
                            Best variant: {bestVariant.name} ({bestVariant.colors}) at {bestVariant.elo} ELO
                          </div>
                        )}
                        {colorAdvice && (
                          <div className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded">
                            {colorAdvice}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {showCoachExplanation && (
                <>
                  {/* Deck Needs */}
                  {coachExplanation.deckNeeds && coachExplanation.deckNeeds.length > 0 && (
                    <div className="pt-4 border-t border-white/[0.08]">
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Deck Needs</div>
                      <div className="flex flex-wrap gap-2">
                        {coachExplanation.deckNeeds.map((need, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/[0.05] text-white/70 text-sm rounded-lg">
                            {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {coachExplanation.alternatives && coachExplanation.alternatives.length > 0 && (
                    <div className="pt-4 border-t border-white/[0.08]">
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Also Consider</div>
                      <div className="space-y-2">
                        {coachExplanation.alternatives.slice(0, 2).map((alt, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-white/70">{alt.name}</span>
                            <span className="text-white/30 text-[9px]">{alt.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Draft Intelligence Panel */}
        {coachMode && (
          <DraftIntelligencePanel
            draftState={draftState}
            draftPhase={draftPhase}
            archetypeCommitments={archetypeCommitments}
            draftSignals={draftSignals}
            enablerPayoffBalance={enablerPayoffBalance}
            manaBaseStatus={manaBaseStatus}
            curveAnalysis={curveAnalysis}
            topRegrets={topRegrets}
          />
        )}

        {/* Deck Power */}
        {coachMode && deckWinRate && (
          <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="p-2 flex items-center justify-between">
              <span className="text-[9px] text-white/30 uppercase tracking-wider">Power</span>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${deckWinRate.winRate}%` }} />
                </div>
                <span className="text-sm font-bold text-white">{deckWinRate.grade}</span>
              </div>
            </div>
          </div>
        )}

        {/* Deck Stats */}
        <DeckStatsPanel
          draftState={draftState}
          colorCounts={colorCounts}
          deckStats={deckStats}
          progress={progress}
          onHoverCard={onHoverCard}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface DraftIntelligencePanelProps {
  draftState: DraftState;
  draftPhase: { phase: DraftPhase; description: string; priority: string } | null;
  archetypeCommitments: ArchetypeCommitment[];
  draftSignals: DraftSignals | null;
  enablerPayoffBalance: EnablerPayoffBalance[];
  manaBaseStatus: ManaBaseStatus | null;
  curveAnalysis: CurveAnalysis | null;
  topRegrets: { card: CubeCard; passedAt: number; whyRegret: string }[];
}

function DraftIntelligencePanel({
  draftState,
  draftPhase,
  archetypeCommitments,
  draftSignals,
  enablerPayoffBalance,
  manaBaseStatus,
  curveAnalysis,
  topRegrets,
}: DraftIntelligencePanelProps) {
  const archColors: Record<string, { text: string; bar: string }> = {
    'Reanimator': { text: 'text-purple-400', bar: 'bg-purple-500' },
    'Storm': { text: 'text-indigo-400', bar: 'bg-indigo-500' },
    'Aggro': { text: 'text-red-400', bar: 'bg-red-500' },
    'Control': { text: 'text-blue-400', bar: 'bg-blue-500' },
    'Artifact Combo': { text: 'text-slate-300', bar: 'bg-slate-400' },
    'Ramp': { text: 'text-green-400', bar: 'bg-green-500' },
    'Sneak & Show': { text: 'text-rose-400', bar: 'bg-rose-500' },
    'Midrange': { text: 'text-amber-400', bar: 'bg-amber-500' },
  };

  const colorBg: Record<string, string> = {
    'W': 'bg-amber-100 text-amber-900',
    'U': 'bg-blue-500 text-white',
    'B': 'bg-neutral-600 text-white',
    'R': 'bg-red-500 text-white',
    'G': 'bg-green-600 text-white',
  };

  const colorBgDim: Record<string, string> = {
    'W': 'bg-amber-100/50 text-amber-900/50',
    'U': 'bg-blue-500/50 text-white/50',
    'B': 'bg-neutral-600/50 text-white/50',
    'R': 'bg-red-500/50 text-white/50',
    'G': 'bg-green-600/50 text-white/50',
  };

  return (
    <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Phase Indicator */}
      {draftPhase && (
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">{draftPhase.description}</span>
            <span className="text-[9px] text-white/50 font-mono">
              {draftState.pickNumber}/15
            </span>
          </div>
          <div className="text-[10px] text-white/50 mt-1 leading-tight">{draftPhase.priority}</div>
        </div>
      )}

      {/* Archetype Probability */}
      {archetypeCommitments.length > 0 && (
        <div className="p-2 border-b border-white/[0.06]">
          <div className="text-[9px] text-white/30 mb-1.5">Archetypes</div>
          <div className="space-y-1.5">
            {archetypeCommitments.slice(0, 3).map((arch) => {
              const colors = archColors[arch.archetype] || { text: 'text-white/60', bar: 'bg-white/40' };
              return (
                <div key={arch.archetype}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className={colors.text}>{arch.archetype}</span>
                    <span className="text-white/50 font-mono">{arch.probability}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} transition-all`}
                      style={{ width: `${arch.probability}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signal Indicators */}
      {draftSignals && (draftSignals.colorsOpen.length > 0 || draftSignals.colorsCut.length > 0) && (
        <div className="p-2 border-b border-white/[0.06]">
          <div className="text-[9px] text-white/30 mb-1">Signals</div>
          <div className="space-y-1.5">
            {draftSignals.colorsOpen.length > 0 && (
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="text-green-400/70">Open:</span>
                {draftSignals.colorsOpen.slice(0, 3).map(({ color }) => (
                  <span key={color} className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${colorBg[color]}`}>
                    {color}
                  </span>
                ))}
              </div>
            )}
            {draftSignals.colorsCut.length > 0 && (
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="text-red-400/70">Cut:</span>
                {draftSignals.colorsCut.slice(0, 3).map(({ color }) => (
                  <span key={color} className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${colorBgDim[color]} line-through`}>
                    {color}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combo Balance */}
      {enablerPayoffBalance.length > 0 && enablerPayoffBalance.some(b => b.balance !== 'balanced') && (
        <div className="p-2 border-b border-white/[0.06]">
          {enablerPayoffBalance.filter(b => b.balance !== 'balanced').slice(0, 1).map((balance, i) => (
            <div key={i} className="text-[10px] text-white/50">
              <span className="text-white/70">{balance.archetype}:</span> {balance.recommendation}
            </div>
          ))}
        </div>
      )}

      {/* Mana Base */}
      {manaBaseStatus && manaBaseStatus.recommendation && (
        <div className="p-2 border-b border-white/[0.06]">
          <div className="text-[10px] text-white/50">{manaBaseStatus.recommendation}</div>
        </div>
      )}

      {/* Curve Analysis */}
      {curveAnalysis && (
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-end gap-0.5">
              {[
                curveAnalysis.distribution.find(d => d.cmc === 1)?.count || 0,
                curveAnalysis.distribution.find(d => d.cmc === 2)?.count || 0,
                curveAnalysis.distribution.find(d => d.cmc === 3)?.count || 0,
                curveAnalysis.distribution.filter(d => d.cmc >= 4).reduce((sum, d) => sum + d.count, 0)
              ].map((count, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-3 bg-white/30 rounded-sm"
                    style={{ height: `${Math.max(2, count * 3)}px` }}
                  />
                  <span className="text-[7px] text-white/30 mt-0.5">{i < 3 ? i + 1 : '4+'}</span>
                </div>
              ))}
            </div>
            <span className="text-[9px] text-white/40">{curveAnalysis.avgCmc.toFixed(1)} avg</span>
          </div>
        </div>
      )}

      {/* Passed cards */}
      {topRegrets.length > 0 && (
        <div className="p-2">
          <div className="text-[9px] text-white/30 mb-1">Passed</div>
          <div className="flex gap-1">
            {topRegrets.slice(0, 3).map((regret, i) => (
              <div key={i} className="w-6 h-8 rounded overflow-hidden opacity-50">
                <img src={getCardImage(regret.card)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DeckStatsPanelProps {
  draftState: DraftState;
  colorCounts: Record<string, number>;
  deckStats: { creatures: number; spells: number; lands: number; avgCmc: number } | null;
  progress: number;
  onHoverCard: (card: CubeCard) => void;
}

function DeckStatsPanel({
  draftState,
  colorCounts,
  deckStats,
  progress,
  onHoverCard,
}: DeckStatsPanelProps) {
  const colorStyles: Record<string, { bg: string; text: string; dim: string }> = {
    'W': { bg: 'bg-amber-100', text: 'text-amber-900', dim: 'bg-amber-100/20 text-amber-200/30' },
    'U': { bg: 'bg-blue-500', text: 'text-white', dim: 'bg-blue-500/20 text-blue-300/30' },
    'B': { bg: 'bg-neutral-600', text: 'text-white', dim: 'bg-neutral-600/20 text-neutral-300/30' },
    'R': { bg: 'bg-red-500', text: 'text-white', dim: 'bg-red-500/20 text-red-300/30' },
    'G': { bg: 'bg-green-600', text: 'text-white', dim: 'bg-green-600/20 text-green-300/30' },
    'C': { bg: 'bg-slate-400', text: 'text-slate-900', dim: 'bg-slate-400/20 text-slate-300/30' },
  };

  return (
    <>
      {/* Deck Stats */}
      <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Deck</span>
            <span className="text-[10px] text-white/50 font-mono">{draftState.picks.length}/45</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/40 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Colors */}
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex gap-1 justify-center">
            {['W', 'U', 'B', 'R', 'G', 'C'].map(c => {
              const count = c === 'C'
                ? draftState.picks.filter(p => !p.color_identity || p.color_identity.length === 0).length
                : (colorCounts[c] || 0);
              const style = colorStyles[c];
              return (
                <div
                  key={c}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all
                    ${count === 0 ? style.dim : `${style.bg} ${style.text}`}
                    ${count >= 5 ? 'ring-1 ring-white/40' : ''}
                  `}
                >
                  {count}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        {deckStats && (
          <div className="p-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
            <div className="flex justify-between"><span className="text-white/30">Creatures</span><span className="text-white/60 font-mono">{deckStats.creatures}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Spells</span><span className="text-white/60 font-mono">{deckStats.spells}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Lands</span><span className="text-white/60 font-mono">{deckStats.lands}</span></div>
            <div className="flex justify-between"><span className="text-white/30">CMC</span><span className="text-white/60 font-mono">{deckStats.avgCmc.toFixed(1)}</span></div>
          </div>
        )}
      </div>

      {/* Picks */}
      <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="p-2 border-b border-white/[0.06]">
          <span className="text-[9px] text-white/30 uppercase tracking-wider">Picks</span>
        </div>
        <div className="p-1.5 max-h-40 overflow-y-auto">
          {draftState.picks.length === 0 ? (
            <p className="text-[10px] text-white/20 text-center py-3">No picks yet</p>
          ) : (
            <div className="grid grid-cols-4 gap-0.5">
              {draftState.picks.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  className="aspect-[488/680] rounded overflow-hidden hover:scale-105 transition-transform cursor-pointer hover:z-10 opacity-80 hover:opacity-100"
                  onMouseEnter={() => onHoverCard(card)}
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
