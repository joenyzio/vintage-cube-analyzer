/**
 * Draft Pack Component
 *
 * Renders the grid of cards in the current pack.
 */

// React is used for JSX
import type { CubeCard } from '../../types/card';
import type { ContextualGrade, DraftState } from '../../types/draftSimulator';
import { DraftPackCard } from './DraftPackCard';
import { getPercentile, getWheelLikelihood } from '../../services/eloHelpers';
import { getWheelCategory } from '../../services/simulationInsights';

interface DraftPackProps {
  pack: CubeCard[];
  draftState: DraftState;
  recommendedCardId?: string;
  showCoachVisuals: boolean;
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
        const wheelLikelihood = getWheelLikelihood(card.name);
        const percentile = getPercentile(card.name);
        const isPremium = percentile >= 75;
        const wheelCategory = getWheelCategory(card.name);
        const actuallyWheeled = draftState.wheeledCards.has(card.id);
        const cardGrade = getGrade(card);
        const synergyAdjustment = getSynergyAdjustment(card);

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
            wheelLikelihood={wheelLikelihood}
            isPremium={isPremium}
            actuallyWheeled={actuallyWheeled}
            showCoachVisuals={showCoachVisuals}
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
