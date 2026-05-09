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
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-purple-500/30 rounded-2xl blur-xl" />

            {/* Card image */}
            <img
              src={imageUrl}
              alt={card.name}
              className="relative w-[250px] rounded-xl shadow-2xl shadow-black/50 border border-white/10"
              style={{
                transform: 'perspective(1000px) rotateY(-5deg)',
              }}
            />

            {/* Power level badge */}
            <div className={`
              absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center
              text-sm font-bold shadow-lg
              ${card.powerLevel >= 9 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white' : ''}
              ${card.powerLevel < 7 ? 'bg-gradient-to-br from-gray-600 to-gray-800 text-white' : ''}
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
      <span className={`cursor-pointer hover:text-purple-400 transition-colors ${className}`}>
        {card.name}
      </span>
    </CardPreview>
  );
}
