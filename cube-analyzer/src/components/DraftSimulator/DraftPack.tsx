/**
 * Draft Pack Component
 *
 * Renders the grid of cards in the current pack.
 * Integrates IWD-based CardSignal for divergence detection.
 */

// React is used for JSX
import type { CubeCard } from '../../types/card';
import type { ContextualGrade, DraftState } from '../../types/draftSimulator';
import { DraftPackCard } from './DraftPackCard';
import { getWheelCategory, getCardSignal } from '../../services/simulationInsights';

interface DraftPackProps {
  pack: CubeCard[];
  draftState: DraftState;
  recommendedCardId?: string;
  showCoachVisuals: boolean;
  // Current deck colors for IWD filtering
  currentColors?: string[];
  // Quiz mode
  isQuizMode: boolean;
  isShowingReveal: boolean;
  pendingPickId?: string;
  lastPickResult?: {
    yourPick: CubeCard;
    wasCorrect: boolean;
  } | null;
  // Handlers
  onCardClick: (card: CubeCard) => void;
  onCardHover: (card: CubeCard) => void;
  // Helper functions passed from parent
  getGrade: (card: CubeCard) => { grade: ContextualGrade; reason: string };
  getSynergyAdjustment: (card: CubeCard) => number;
}

export function DraftPack({
  pack,
  draftState,
  recommendedCardId,
  showCoachVisuals,
  currentColors = [],
  isQuizMode,
  isShowingReveal,
  pendingPickId,
  lastPickResult,
  onCardClick,
  onCardHover,
  getGrade,
  getSynergyAdjustment,
}: DraftPackProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
      {pack.map((card, index) => {
        const isRecommended = recommendedCardId === card.id;
        const wheelCategory = getWheelCategory(card.name);
        const actuallyWheeled = draftState.wheeledCards.has(card.id);
        const cardGrade = getGrade(card);
        const synergyAdjustment = getSynergyAdjustment(card);
        // Get IWD-based card signal for divergence detection
        const cardSignal = showCoachVisuals ? getCardSignal(card.name, currentColors) : undefined;

        // Quiz mode state
        const isPendingPick = isQuizMode && pendingPickId === card.id;
        const isOriginalPick = isQuizMode && isShowingReveal && lastPickResult?.yourPick.id === card.id;
        const isCurrentSelection = isQuizMode && isShowingReveal && pendingPickId === card.id;
        const didSwitchPick = isQuizMode && isShowingReveal && pendingPickId !== lastPickResult?.yourPick.id;

        const isQuizCorrectPick = isOriginalPick && !didSwitchPick && lastPickResult?.wasCorrect;
        const isQuizWrongPick = isOriginalPick && !didSwitchPick && !lastPickResult?.wasCorrect;
        const isSwitchedSelection = isCurrentSelection && didSwitchPick;
        const wasOriginalButSwitched = isOriginalPick && didSwitchPick;

        return (
          <DraftPackCard
            key={card.id}
            card={card}
            index={index}
            isRecommended={isRecommended}
            grade={cardGrade.grade}
            synergyAdjustment={synergyAdjustment}
            wheelCategory={wheelCategory}
            actuallyWheeled={actuallyWheeled}
            showCoachVisuals={showCoachVisuals}
            cardSignal={cardSignal}
            isQuizMode={isQuizMode}
            isShowingReveal={isShowingReveal}
            isPendingPick={isPendingPick}
            isQuizCorrectPick={!!isQuizCorrectPick}
            isQuizWrongPick={!!isQuizWrongPick}
            isSwitchedSelection={!!isSwitchedSelection}
            wasOriginalButSwitched={!!wasOriginalButSwitched}
            onClick={() => onCardClick(card)}
            onHover={() => onCardHover(card)}
          />
        );
      })}
    </div>
  );
}
