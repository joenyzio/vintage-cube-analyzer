/**
 * Draft Pack Card Component
 *
 * Renders a single card in the draft pack with all its overlays and indicators.
 */

// React is used for JSX
import { Star, History, CheckCircle, XCircle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { ContextualGrade } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';

interface DraftPackCardProps {
  card: CubeCard;
  index: number;
  isRecommended: boolean;
  grade: ContextualGrade;
  synergyAdjustment: number;
  wheelCategory: 'high-wheel' | 'low-wheel' | 'normal';
  wheelLikelihood: string;
  isPremium: boolean;
  actuallyWheeled: boolean;
  showCoachVisuals: boolean;
  // Quiz mode props
  isQuizMode: boolean;
  isShowingReveal: boolean;
  isPendingPick: boolean;
  isQuizCorrectPick: boolean;
  isQuizWrongPick: boolean;
  isSwitchedSelection: boolean;
  wasOriginalButSwitched: boolean;
  // Handlers
  onClick: () => void;
  onHover: () => void;
}

export function DraftPackCard({
  card,
  index,
  isRecommended,
  grade,
  synergyAdjustment,
  wheelCategory,
  wheelLikelihood,
  isPremium,
  actuallyWheeled,
  showCoachVisuals,
  isQuizMode,
  isShowingReveal,
  isPendingPick,
  isQuizCorrectPick,
  isQuizWrongPick,
  isSwitchedSelection,
  wasOriginalButSwitched,
  onClick,
  onHover,
}: DraftPackCardProps) {
  const keyboardNum = index + 1;
  const isTopGrade = grade === 'A+' || grade === 'A';
  const isLowGrade = grade.startsWith('C') || grade.startsWith('D') || grade === 'F';
  const cardOpacity = isLowGrade ? 'opacity-60' : '';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      className={`
        relative aspect-[488/680] rounded-xl overflow-hidden
        transition-all duration-200
        ${!(isQuizMode && isShowingReveal) ? 'hover:scale-[1.04] hover:-translate-y-1 hover:z-10' : 'hover:ring-2 hover:ring-white/30'}
        cursor-pointer
        ${cardOpacity}
        ${isPendingPick && !isShowingReveal ? 'ring-4 ring-purple-500 scale-[1.02]' : ''}
        ${isQuizCorrectPick ? 'ring-4 ring-green-500 scale-[1.02]' : ''}
        ${isQuizWrongPick ? 'ring-4 ring-red-500 scale-[1.02]' : ''}
        ${isSwitchedSelection ? 'ring-4 ring-blue-500 scale-[1.02]' : ''}
        ${wasOriginalButSwitched ? 'ring-2 ring-red-500/40 opacity-60' : ''}
        ${showCoachVisuals && isRecommended && !isSwitchedSelection && !isQuizCorrectPick && !isQuizWrongPick ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : ''}
        ${showCoachVisuals && !isRecommended && isTopGrade && !isSwitchedSelection && !isQuizCorrectPick && !isQuizWrongPick ? 'ring-1 ring-white/40' : ''}
      `}
    >
      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

      {/* Keyboard shortcut hint */}
      {keyboardNum <= 9 && (
        <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/50">
          {keyboardNum}
        </div>
      )}

      {/* Wheeled back indicator */}
      {showCoachVisuals && actuallyWheeled && (
        <div className="absolute top-8 left-1.5 flex items-center gap-1">
          <History className="w-3 h-3 text-emerald-400" />
        </div>
      )}

      {/* Simulation wheel indicator */}
      {showCoachVisuals && wheelCategory !== 'normal' && (
        <div className={`absolute inset-0 rounded-xl pointer-events-none ${
          wheelCategory === 'high-wheel'
            ? 'ring-2 ring-inset ring-cyan-400/40'
            : 'ring-2 ring-inset ring-orange-400/40'
        }`}>
          <div className={`absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
            wheelCategory === 'high-wheel'
              ? 'bg-cyan-500/80 text-white'
              : 'bg-orange-500/80 text-white'
          }`}>
            {wheelCategory === 'high-wheel' ? 'Wheels' : 'Rare'}
          </div>
        </div>
      )}

      {/* Grade and adjustment overlay */}
      {showCoachVisuals && (
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
          <div className={`
            px-1.5 py-0.5 rounded text-[11px] font-bold shadow
            ${grade === 'A+' ? 'bg-emerald-500/90 text-white' : ''}
            ${grade === 'A' ? 'bg-emerald-600/80 text-white' : ''}
            ${grade === 'A-' ? 'bg-emerald-700/70 text-white' : ''}
            ${grade === 'B+' ? 'bg-sky-600/70 text-white' : ''}
            ${grade === 'B' ? 'bg-sky-700/60 text-white/90' : ''}
            ${grade === 'B-' ? 'bg-sky-800/50 text-white/80' : ''}
            ${grade === 'C+' || grade === 'C' || grade === 'C-' ? 'bg-black/60 text-white/70' : ''}
            ${grade === 'D' || grade === 'F' ? 'bg-black/50 text-white/50' : ''}
          `}>
            {grade}
          </div>
          {Math.abs(synergyAdjustment) >= 20 && (
            <div className={`
              text-[10px] font-bold px-1 rounded
              ${synergyAdjustment > 0 ? 'text-emerald-400 bg-black/40' : 'text-red-400 bg-black/40'}
            `}>
              {synergyAdjustment > 0 ? '+' : ''}{synergyAdjustment}
            </div>
          )}
        </div>
      )}

      {/* Take now banner for premium cards */}
      {showCoachVisuals && wheelLikelihood === 'unlikely' && isPremium && !isRecommended && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1">
          <span className="text-[9px] font-medium text-white/80 uppercase tracking-wider">Take now</span>
        </div>
      )}

      {/* Best pick indicator */}
      {showCoachVisuals && isRecommended && (
        <div className="absolute top-1.5 left-1.5">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-lg" />
        </div>
      )}

      {/* Quiz result badge */}
      {(isQuizCorrectPick || isQuizWrongPick) && (
        <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
          isQuizCorrectPick ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {isQuizCorrectPick ? (
            <CheckCircle className="w-4 h-4 text-white" />
          ) : (
            <XCircle className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      {/* Switched selection badge */}
      {isSwitchedSelection && (
        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Faded X on original pick when switched */}
      {wasOriginalButSwitched && (
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500/50 flex items-center justify-center">
          <XCircle className="w-3 h-3 text-white/70" />
        </div>
      )}
    </div>
  );
}
