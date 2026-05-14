/**
 * Quiz Mode Component
 *
 * P1P1 Quiz UI - displays a pack of cards and tracks user picks against ELO data.
 */

// React is used for JSX
import { HelpCircle, RotateCcw, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { QuizState } from '../../hooks/useQuizMode';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getPercentile } from '../../services/eloHelpers';

interface QuizModeProps {
  quizState: QuizState;
  quizAccuracy: number | null;
  hoveredCard: CubeCard | null;
  onMakePick: (card: CubeCard) => void;
  onNextQuestion: () => void;
  onHoverCard: (card: CubeCard) => void;
  onReturnToMenu: () => void;
}

export function QuizMode({
  quizState,
  quizAccuracy,
  hoveredCard,
  onMakePick,
  onNextQuestion,
  onHoverCard,
  onReturnToMenu,
}: QuizModeProps) {
  const correctElo = getEloData(quizState.correctCard.name);
  const userElo = quizState.userPick ? getEloData(quizState.userPick.name) : null;
  const isCorrect = quizState.userPick?.id === quizState.correctCard.id;

  return (
    <div className="pb-24">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">P1P1 Quiz</h2>
            <p className="text-xs text-white/40">Pick the best card based on ELO</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score */}
          {quizState.history.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <span className="text-xs text-white/40">
                {quizState.history.filter(h => h.correct).length}/{quizState.history.length}
              </span>
              <span className={`text-sm font-bold ${
                quizAccuracy && quizAccuracy >= 70 ? 'text-green-400' :
                quizAccuracy && quizAccuracy >= 50 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {quizAccuracy}%
              </span>
            </div>
          )}

          <button
            onClick={onReturnToMenu}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-white/15 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* Compact instruction */}
      {!quizState.revealed && (
        <div className="text-center text-white/30 text-xs mb-3">
          Click the card you would first-pick · Press 1-9 for quick select
        </div>
      )}

      {/* Pack Grid - More compact with 5 columns */}
      <div className="grid grid-cols-5 gap-2">
        {quizState.currentPack.map((card, index) => {
          const isThisCorrect = card.id === quizState.correctCard.id;
          const isUserPick = card.id === quizState.userPick?.id;
          const cardElo = getEloData(card.name);
          const percentile = getPercentile(card.name);
          const keyNum = index + 1;

          return (
            <div
              key={card.id}
              onClick={() => onMakePick(card)}
              onMouseEnter={() => onHoverCard(card)}
              className={`
                relative aspect-[488/680] rounded-lg overflow-hidden shadow-lg
                transition-all duration-200
                ${!quizState.revealed ? 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-xl' : ''}
                ${quizState.revealed && isThisCorrect ? 'ring-3 ring-green-400 shadow-green-400/30 scale-105 z-10' : ''}
                ${quizState.revealed && isUserPick && !isThisCorrect ? 'ring-3 ring-red-400 shadow-red-400/30' : ''}
                ${quizState.revealed && !isThisCorrect && !isUserPick ? 'opacity-40 scale-95' : ''}
              `}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

              {/* Keyboard hint (before reveal) */}
              {!quizState.revealed && keyNum <= 9 && (
                <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/60 flex items-center justify-center text-[10px] font-mono text-white/60">
                  {keyNum}
                </div>
              )}

              {/* Power badge - ONLY show after reveal (it's derived from ELO, would give away answer) */}
              {quizState.revealed && (
                <div className={`
                  absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow
                  ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : ''}
                  ${card.powerLevel === 9 ? 'bg-purple-400 text-white' : ''}
                  ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-blue-400 text-white' : ''}
                  ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
                `}>
                  {card.powerLevel}
                </div>
              )}

              {/* Revealed indicators */}
              {quizState.revealed && (
                <>
                  {isThisCorrect && (
                    <div className="absolute top-1 left-1">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                  {isUserPick && !isThisCorrect && (
                    <div className="absolute top-1 left-1">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
                        <XCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                  {/* ELO overlay - only on correct/picked */}
                  {(isThisCorrect || isUserPick) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pt-4">
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-white/90">ELO {cardElo ? Math.round(cardElo.elo) : '?'}</div>
                        <div className={`text-[9px] ${
                          percentile >= 75 ? 'text-amber-400' :
                          percentile >= 50 ? 'text-purple-400' :
                          'text-white/50'
                        }`}>
                          Top {100 - percentile}%
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Result Bar */}
      {quizState.revealed && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className={`
              flex items-center gap-3 px-4 py-2 rounded-lg flex-1
              ${isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}
            `}>
              {isCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-green-400 text-sm">Correct!</div>
                    <div className="text-xs text-white/50 truncate">
                      {quizState.correctCard.name} · ELO {correctElo ? Math.round(correctElo.elo) : '?'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-red-400 text-sm">Not quite!</div>
                    <div className="text-xs text-white/50 truncate">
                      Best: {quizState.correctCard.name} ({correctElo ? Math.round(correctElo.elo) : '?'})
                      {userElo && <span className="text-white/30"> vs {Math.round(userElo.elo)}</span>}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onNextQuestion}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all active:scale-95 flex-shrink-0"
            >
              Next Pack
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
          <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl w-60">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-full rounded-lg" />
            <div className="mt-2 px-1 space-y-1">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line?.split('—')[0]}</div>
              {!quizState.revealed && (
                <div className="text-[10px] text-amber-400/70 pt-1 border-t border-white/10">
                  ELO hidden until you pick
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
