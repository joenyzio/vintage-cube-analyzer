/**
 * Landing Page - Share-ready entry point
 *
 * Linktree-style page that links to:
 * - The full app experience
 * - CubeCobra
 * - Other resources
 *
 * Clean, shareable, professional.
 */

import { Sparkles, Play, ExternalLink, BookOpen, Users, Calendar, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  cubeInfo?: {
    name: string;
    cardCount: number;
    description: string;
    cubeCobraUrl: string;
    discordUrl?: string;
    eventDate?: string;
    eventLocation?: string;
  };
}

const DEFAULT_INFO = {
  name: 'Vintage Cube',
  cardCount: 360,
  description: 'A powered cube featuring the most iconic cards in Magic history. Storm, Reanimator, Tinker, and more.',
  cubeCobraUrl: 'https://cubecobra.com/cube/list/8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd',
};

export function LandingPage({ onEnterApp, cubeInfo = DEFAULT_INFO }: LandingPageProps) {
  const info = { ...DEFAULT_INFO, ...cubeInfo };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01] pointer-events-none" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-md space-y-8">

          {/* Logo & Title */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto glass-card rounded-2xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white/70" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{info.name}</h1>
              <p className="text-white/40 text-sm mt-1">{info.cardCount} cards</p>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
              {info.description}
            </p>
          </div>

          {/* Event Info (if provided) */}
          {(info.eventDate || info.eventLocation) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-white/40" />
                <div>
                  {info.eventDate && (
                    <div className="text-sm font-medium text-white">{info.eventDate}</div>
                  )}
                  {info.eventLocation && (
                    <div className="text-xs text-white/40">{info.eventLocation}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary CTA - Enter Experience */}
          <button
            onClick={onEnterApp}
            className="w-full group relative overflow-hidden bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.2] rounded-xl p-4 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-white/80" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-semibold text-white">Enter Experience</div>
                <div className="text-xs text-white/40">Draft simulator, training, analytics</div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Secondary Links */}
          <div className="space-y-3">
            {/* CubeCobra */}
            <a
              href={info.cubeCobraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-4 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white/50" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white/80">View on CubeCobra</div>
                <div className="text-xs text-white/30">Full card list & cube stats</div>
              </div>
              <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </a>

            {/* Discord (if provided) */}
            {info.discordUrl && (
              <a
                href={info.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-4 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white/50" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white/80">Join Community</div>
                  <div className="text-xs text-white/30">Discord server</div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </a>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-[11px] text-white/20">
              Powered by Cube Analyzer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
