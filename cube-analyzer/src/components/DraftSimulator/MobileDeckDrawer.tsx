/**
 * Mobile Deck Drawer Component
 *
 * Shows the user's picked cards in a mobile-friendly drawer.
 */

// React is used for JSX
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getColorCounts, calculateDeckStats } from '../../services/draftUtilities';

interface MobileDeckDrawerProps {
  picks: CubeCard[];
  onCardSelect: (card: CubeCard) => void;
  onClose: () => void;
}

export function MobileDeckDrawer({
  picks,
  onCardSelect,
  onClose,
}: MobileDeckDrawerProps) {
  const colorCounts = getColorCounts(picks);
  const deckStats = calculateDeckStats(picks);

  return (
    <div className="fixed inset-0 z-[70] sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 top-12 bg-black border-t border-white/10 rounded-t-3xl animate-in slide-in-from-bottom duration-200 flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Your Deck</h3>
            <span className="text-sm text-white/50 font-mono">{picks.length}/45</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/50 rounded-full transition-all"
              style={{ width: `${(picks.length / 45) * 100}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 py-3 border-b border-white/10">
          {/* Colors */}
          <div className="flex gap-2 justify-center mb-3">
            {['W', 'U', 'B', 'R', 'G'].map(c => {
              const count = colorCounts[c] || 0;
              return (
                <div
                  key={c}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                    ${count === 0 ? 'opacity-30' : ''}
                    ${c === 'W' ? 'bg-amber-100 text-amber-900' : ''}
                    ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                    ${c === 'B' ? 'bg-neutral-600 text-white' : ''}
                    ${c === 'R' ? 'bg-red-500 text-white' : ''}
                    ${c === 'G' ? 'bg-green-600 text-white' : ''}
                  `}
                >
                  {count}
                </div>
              );
            })}
          </div>

          {/* Type Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white font-mono">{deckStats.creatures}</div>
              <div className="text-white/40">Creatures</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white font-mono">{deckStats.spells}</div>
              <div className="text-white/40">Spells</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white font-mono">{deckStats.avgCmc.toFixed(1)}</div>
              <div className="text-white/40">Avg CMC</div>
            </div>
          </div>
        </div>

        {/* Cards Grid - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3">
          {picks.length === 0 ? (
            <p className="text-center text-white/40 py-8">No cards drafted yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {picks.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  className="relative aspect-[488/680] rounded-lg overflow-hidden active:scale-95 transition-transform"
                  onClick={() => onCardSelect(card)}
                >
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Pick number badge */}
                  <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/70">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4 pb-8 border-t border-white/10 bg-black">
          <button
            onClick={onClose}
            className="w-full py-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
          >
            Back to Draft
          </button>
        </div>
      </div>
    </div>
  );
}
