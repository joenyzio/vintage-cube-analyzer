import { useState, useRef, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';

interface CardPreviewProps {
  card: CubeCard;
  children: React.ReactNode;
}

export function CardPreview({ card, children }: CardPreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = rect.right + 20;
    let y = rect.top;

    // Flip to left if would overflow right
    if (x + 250 > viewportWidth) {
      x = rect.left - 270;
    }

    // Adjust vertical position if would overflow bottom
    if (y + 350 > viewportHeight) {
      y = viewportHeight - 370;
    }

    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const imageUrl = getCardImage(card);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      {children}

      {isVisible && imageUrl && (
        <div
          ref={previewRef}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <div className="relative animate-in fade-in zoom-in-95 duration-150">
            {/* Card container */}
            <div className="bg-[#111] p-2 rounded-xl border border-white/10 shadow-2xl">
              <img
                src={imageUrl}
                alt={card.name}
                className="w-[250px] rounded-lg"
              />
              <div className="mt-2 px-1">
                <h4 className="font-medium text-white text-sm">{card.name}</h4>
                <p className="text-xs text-white/40">{card.type_line}</p>
              </div>
            </div>

            {/* Power level badge */}
            <div className={`
              absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center
              text-xs font-mono shadow-lg
              ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-white/80 text-black' : ''}
              ${card.powerLevel < 7 ? 'bg-white/20 text-white/70' : ''}
            `}>
              {card.powerLevel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline card name with hover preview
export function CardLink({ card, className = '' }: { card: CubeCard; className?: string }) {
  return (
    <CardPreview card={card}>
      <span className={`cursor-pointer hover:text-white transition-colors ${className}`}>
        {card.name}
      </span>
    </CardPreview>
  );
}
