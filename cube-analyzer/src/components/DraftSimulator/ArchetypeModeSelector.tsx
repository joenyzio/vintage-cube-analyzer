/**
 * Archetype Mode Selector
 *
 * Allows user to select their draft direction:
 * - Open: General ratings, no archetype commitment
 * - Leaning: Considering 1-2 archetypes, shows weighted ratings
 * - Committed: Locked into an archetype, ratings fully reweighted
 *
 * Also shows drift detection - emerging archetype signals from picks.
 */

import { useState } from 'react';
import { Target, Lock, Compass, Sparkles, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { DraftMode } from '../../services/cardRating/archetypeMode';
import { detectArchetypeDrift, ARCHETYPES } from '../../services/cardRating/archetypeMode';
import type { ArchetypeDefinition } from '../../services/cardRating/types';

interface ArchetypeModeSelectorProps {
  picks: CubeCard[];
  draftMode: DraftMode;
  selectedArchetype: string | null;
  onModeChange: (mode: DraftMode) => void;
  onArchetypeSelect: (archetypeId: string | null) => void;
}

export function ArchetypeModeSelector({
  picks,
  draftMode,
  selectedArchetype,
  onModeChange,
  onArchetypeSelect,
}: ArchetypeModeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const driftSignals = detectArchetypeDrift(picks);
  const dominantDrift = driftSignals.length > 0 ? driftSignals[0] : null;

  // Mode icons and colors
  const getModeStyle = (mode: DraftMode) => {
    switch (mode) {
      case 'open':
        return { icon: Compass, color: 'text-white/50', bg: 'bg-white/5' };
      case 'leaning':
        return { icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' };
      case 'committed':
        return { icon: Lock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    }
  };

  const currentStyle = getModeStyle(draftMode);
  const ModeIcon = currentStyle.icon;

  return (
    <div className="space-y-2">
      {/* Header: Current Mode */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
          draftMode === 'open'
            ? 'bg-white/[0.02] border-white/[0.06]'
            : draftMode === 'leaning'
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-emerald-500/5 border-emerald-500/20'
        }`}
      >
        <div className="flex items-center gap-2">
          <ModeIcon className={`w-4 h-4 ${currentStyle.color}`} />
          <div className="text-left">
            <div className={`text-sm font-medium ${currentStyle.color}`}>
              {draftMode === 'open' && 'Open'}
              {draftMode === 'leaning' && `Leaning ${getArchetypeName(selectedArchetype)}`}
              {draftMode === 'committed' && `Committed: ${getArchetypeName(selectedArchetype)}`}
            </div>
            <div className="text-[10px] text-white/30">
              {draftMode === 'open' && 'Taking best available'}
              {draftMode === 'leaning' && 'Ratings adjusted for archetype'}
              {draftMode === 'committed' && 'Full archetype weighting'}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/30" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30" />
        )}
      </button>

      {/* Drift Detection - Show when open and there's a signal */}
      {draftMode === 'open' && dominantDrift && dominantDrift.strength >= 30 && (
        <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">
                  Drifting: {dominantDrift.archetypeName}
                </span>
                <span className="text-[10px] text-amber-400/60">
                  {dominantDrift.strength}%
                </span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5 truncate">
                {dominantDrift.supportingCards.slice(0, 3).join(', ')}
              </div>
            </div>
            {dominantDrift.canCommit && (
              <button
                onClick={() => {
                  onArchetypeSelect(dominantDrift.archetypeId);
                  onModeChange('leaning');
                }}
                className="flex-shrink-0 px-2 py-1 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors"
              >
                Lock In
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded: Mode + Archetype Selection */}
      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* Mode Buttons */}
          <div className="flex gap-1">
            {(['open', 'leaning', 'committed'] as DraftMode[]).map((mode) => {
              const style = getModeStyle(mode);
              const Icon = style.icon;
              const isActive = draftMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    onModeChange(mode);
                    if (mode === 'open') {
                      onArchetypeSelect(null);
                    }
                  }}
                  disabled={mode !== 'open' && !selectedArchetype}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${style.bg} ${style.color} ring-1 ring-inset ${
                          mode === 'open' ? 'ring-white/10' :
                          mode === 'leaning' ? 'ring-amber-500/30' :
                          'ring-emerald-500/30'
                        }`
                      : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.04]'
                  } ${mode !== 'open' && !selectedArchetype ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="capitalize">{mode}</span>
                </button>
              );
            })}
          </div>

          {/* Archetype Grid */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider px-1">
              Select Archetype
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(ARCHETYPES as ArchetypeDefinition[]).map((arch) => {
                const driftSignal = driftSignals.find(d => d.archetypeId === arch.id);
                const isSelected = selectedArchetype === arch.id;
                return (
                  <button
                    key={arch.id}
                    onClick={() => {
                      if (isSelected) {
                        onArchetypeSelect(null);
                        onModeChange('open');
                      } else {
                        onArchetypeSelect(arch.id);
                        if (draftMode === 'open') {
                          onModeChange('leaning');
                        }
                      }
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-inset ring-amber-500/30'
                        : driftSignal && driftSignal.strength >= 20
                        ? 'bg-white/[0.04] text-white/70 hover:bg-white/[0.06]'
                        : 'bg-white/[0.02] text-white/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate">{arch.shortName}</span>
                    {driftSignal && driftSignal.strength >= 15 && (
                      <span className={`text-[10px] font-mono ${
                        driftSignal.strength >= 40 ? 'text-emerald-400' :
                        driftSignal.strength >= 25 ? 'text-amber-400' :
                        'text-white/30'
                      }`}>
                        {driftSignal.strength}%
                      </span>
                    )}
                    {isSelected && (
                      <X className="w-3 h-3 text-amber-400/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Archetype Info */}
          {selectedArchetype && (
            <div className="px-2 py-2 bg-white/[0.02] rounded-lg space-y-1">
              <div className="text-xs font-medium text-white">
                {getArchetypeName(selectedArchetype)}
              </div>
              <div className="text-[10px] text-white/40">
                {getArchetypeDescription(selectedArchetype)}
              </div>
              {driftSignals.find(d => d.archetypeId === selectedArchetype)?.keyCardsMissing.length ? (
                <div className="text-[10px] text-white/30 pt-1">
                  <span className="text-white/50">Missing: </span>
                  {driftSignals.find(d => d.archetypeId === selectedArchetype)?.keyCardsMissing.join(', ')}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function getArchetypeName(archetypeId: string | null): string {
  if (!archetypeId) return '';
  const arch = (ARCHETYPES as ArchetypeDefinition[]).find((a: ArchetypeDefinition) => a.id === archetypeId);
  return arch?.name || archetypeId;
}

function getArchetypeDescription(archetypeId: string): string {
  const arch = (ARCHETYPES as ArchetypeDefinition[]).find((a: ArchetypeDefinition) => a.id === archetypeId);
  return arch?.description || '';
}
