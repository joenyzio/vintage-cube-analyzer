import type { ScryfallCard } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

// Rate limiting: Scryfall asks for 50-100ms between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchCard(name: string): Promise<ScryfallCard | null> {
  try {
    const response = await fetch(
      `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`
    );
    if (!response.ok) {
      console.warn(`Card not found: ${name}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching card ${name}:`, error);
    return null;
  }
}

export async function fetchCardsBatch(names: string[]): Promise<ScryfallCard[]> {
  // Scryfall collection endpoint allows up to 75 cards per request
  const batches: string[][] = [];
  for (let i = 0; i < names.length; i += 75) {
    batches.push(names.slice(i, i + 75));
  }

  const allCards: ScryfallCard[] = [];

  for (const batch of batches) {
    try {
      const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifiers: batch.map(name => ({ name })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        allCards.push(...data.data);
      }
    } catch (error) {
      console.error('Error fetching batch:', error);
    }

    // Rate limit compliance
    await delay(100);
  }

  return allCards;
}

export function getCardImage(card: ScryfallCard): string {
  if (card.image_uris?.normal) {
    return card.image_uris.normal;
  }
  if (card.card_faces?.[0]?.image_uris?.normal) {
    return card.card_faces[0].image_uris.normal;
  }
  return '';
}

export function getCardArtCrop(card: ScryfallCard): string {
  if (card.image_uris?.art_crop) {
    return card.image_uris.art_crop;
  }
  if (card.card_faces?.[0]?.image_uris?.art_crop) {
    return card.card_faces[0].image_uris.art_crop;
  }
  return '';
}
