/**
 * Draft Menu Component
 *
 * The main landing/hero screen for the draft simulator.
 */

// React is used for JSX
import { Play, Users, Package, Target, Zap, TrendingUp, Award, History, HelpCircle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { DraftStats, DraftHistoryEntry } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { ACHIEVEMENTS } from '../../data/draftSimulatorConstants';

interface DraftMenuProps {
  featuredCards: CubeCard[];
  draftStats: DraftStats;
  draftHistory: DraftHistoryEntry[];
  unlockedAchievements: string[];
  onStartDraft: (isQuizDraft?: boolean) => void;
  onStartQuiz: () => void;
}

export function DraftMenu({
  featuredCards,
  draftStats,
  draftHistory,
  unlockedAchievements,
  onStartDraft,
  onStartQuiz,
}: DraftMenuProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <HeroSection
        featuredCards={featuredCards}
        onStartDraft={onStartDraft}
        onStartQuiz={onStartQuiz}
      />

      {/* Info Cards */}
      <InfoCards />

      {/* Your Stats */}
      {draftStats.totalDrafts > 0 && (
        <StatsSection
          draftStats={draftStats}
          unlockedAchievements={unlockedAchievements}
        />
      )}

      {/* Recent Drafts */}
      {draftHistory.length > 0 && (
        <RecentDrafts draftHistory={draftHistory} />
      )}

      {/* Featured Cards Preview */}
      <FeaturedCardsPreview cards={featuredCards} />
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface HeroSectionProps {
  featuredCards: CubeCard[];
  onStartDraft: (isQuizDraft?: boolean) => void;
  onStartQuiz: () => void;
}

function HeroSection({ featuredCards, onStartDraft, onStartQuiz }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.06] p-6 sm:p-8">
      {/* Card fan background - hidden on mobile */}
      <div className="hidden sm:flex absolute -right-8 top-1/2 -translate-y-1/2 -space-x-20 opacity-60">
        {featuredCards.slice(0, 5).map((card, i) => (
          <div
            key={card.id}
            className="w-36 aspect-[488/680] rounded-xl overflow-hidden shadow-2xl transform"
            style={{
              transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 10}px)`,
              zIndex: 5 - Math.abs(i - 2),
            }}
          >
            <img src={getCardImage(card)} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Draft Simulator</h2>
        <p className="text-white/50 mb-6 text-sm sm:text-base">
          Practice drafting against 7 AI opponents. Build the best deck from 3 packs of 15 cards each.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => onStartDraft(false)}
          className="flex items-center justify-center gap-3 px-10 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 group active:scale-95"
        >
          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Start Draft
        </button>

        {/* Alternatives */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-white/30 mb-3">Want to test yourself?</div>
          <div className="flex gap-2">
            <button
              onClick={() => onStartDraft(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              <Target className="w-4 h-4 text-purple-400" />
              Quiz Draft
            </button>
            <button
              onClick={onStartQuiz}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              P1P1 Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCards() {
  const cards = [
    {
      icon: Users,
      color: 'blue',
      title: '8 Players',
      description: 'You plus 7 AI drafters with different color preferences',
    },
    {
      icon: Package,
      color: 'purple',
      title: '3 Packs',
      description: '15 cards per pack, alternating pass directions',
    },
    {
      icon: Target,
      color: 'amber',
      title: '45 Picks',
      description: 'Build a 40-card deck from your drafted pool',
    },
    {
      icon: Zap,
      color: 'emerald',
      title: 'P1P1 Quiz',
      description: 'Test your card evaluation skills against ELO data',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  };

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses[card.color];
        return (
          <div key={card.title} className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <h3 className="font-semibold text-white mb-1">{card.title}</h3>
            <p className="text-sm text-white/40">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}

interface StatsSectionProps {
  draftStats: DraftStats;
  unlockedAchievements: string[];
}

function StatsSection({ draftStats, unlockedAchievements }: StatsSectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Stats Summary */}
      <div className="bg-black border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Your Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-white">{draftStats.totalDrafts}</div>
            <div className="text-xs text-white/40">Drafts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{draftStats.avgOptimalRate}%</div>
            <div className="text-xs text-white/40">Avg Optimal</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{draftStats.avgDeckElo}</div>
            <div className="text-xs text-white/40">Avg Deck ELO</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${
              draftStats.bestGrade === 'S' ? 'text-amber-400' :
              draftStats.bestGrade === 'A' ? 'text-purple-400' :
              draftStats.bestGrade === 'B' ? 'text-blue-400' :
              'text-white'
            }`}>{draftStats.bestGrade || '-'}</div>
            <div className="text-xs text-white/40">Best Grade</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-black border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">
            Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`
                  px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all
                  ${isUnlocked
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.02] border border-white/[0.06] text-white/30'
                  }
                `}
                title={achievement.description}
              >
                <span className={isUnlocked ? '' : 'grayscale opacity-50'}>{achievement.icon}</span>
                <span className={isUnlocked ? 'font-medium' : ''}>{achievement.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface RecentDraftsProps {
  draftHistory: DraftHistoryEntry[];
}

function RecentDrafts({ draftHistory }: RecentDraftsProps) {
  return (
    <div className="bg-black border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Recent Drafts</h3>
      </div>
      <div className="space-y-2">
        {draftHistory.slice(0, 5).map(entry => (
          <div key={entry.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-lg">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
              ${entry.grade === 'S' ? 'bg-amber-500/20 text-amber-400' :
                entry.grade === 'A' ? 'bg-purple-500/20 text-purple-400' :
                entry.grade === 'B' ? 'bg-blue-500/20 text-blue-400' :
                entry.grade === 'C' ? 'bg-green-500/20 text-green-400' :
                'bg-white/5 text-white/40'}
            `}>
              {entry.grade}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{entry.mainColors.join('') || 'Colorless'}</span>
                <span className="text-xs text-white/30">{entry.date}</span>
              </div>
              <div className="text-xs text-white/40">
                ELO {entry.deckElo} · {entry.optimalRate}% optimal
              </div>
            </div>
            <div className="flex -space-x-1">
              {entry.topPicks.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-mono text-white/50 ring-1 ring-black"
                  title={p.name}
                >
                  {Math.round(p.elo / 100)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FeaturedCardsPreviewProps {
  cards: CubeCard[];
}

function FeaturedCardsPreview({ cards }: FeaturedCardsPreviewProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">Cards you might see</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative w-28 flex-shrink-0 aspect-[488/680] rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
          >
            <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            <div className={`
              absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : 'bg-purple-400 text-white'}
            `}>
              {card.powerLevel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
