/**
 * Fetches ELO ratings from CubeCobra for all cards in the cube.
 * ELO is based on actual pick data from thousands of drafts.
 *
 * Usage: npx tsx scripts/fetch-elo.ts
 */

const CUBE_ID = '8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd';
const API_URL = `https://cubecobra.com/cube/api/cubeJSON/${CUBE_ID}`;

interface CubeCobraCard {
  details: {
    name: string;
    elo: number;
    pickCount: number;
    cubeCount: number;
    scryfall_id: string;
  };
}

interface EloData {
  [cardName: string]: {
    elo: number;
    pickCount: number;
    cubeCount: number;
    scryfallId: string;
  };
}

async function fetchEloData(): Promise<void> {
  console.log('Fetching ELO data from CubeCobra...');

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch cube data: ${response.status}`);
  }

  const data = await response.json();
  const cards: CubeCobraCard[] = data.cards?.mainboard || [];

  console.log(`Found ${cards.length} cards`);

  // Extract ELO data
  const eloData: EloData = {};
  let minElo = Infinity;
  let maxElo = -Infinity;

  for (const card of cards) {
    const details = card.details;
    if (details?.name && details?.elo) {
      eloData[details.name] = {
        elo: details.elo,
        pickCount: details.pickCount || 0,
        cubeCount: details.cubeCount || 0,
        scryfallId: details.scryfall_id || '',
      };
      minElo = Math.min(minElo, details.elo);
      maxElo = Math.max(maxElo, details.elo);
    }
  }

  // Add metadata
  const output = {
    metadata: {
      cubeId: CUBE_ID,
      fetchedAt: new Date().toISOString(),
      cardCount: Object.keys(eloData).length,
      eloRange: { min: minElo, max: maxElo },
      source: 'CubeCobra - based on pick data from thousands of drafts',
    },
    cards: eloData,
  };

  // Write to file
  const fs = await import('fs');
  const path = await import('path');
  const outputPath = path.join(process.cwd(), 'src/data/elo-ratings.json');

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nELO data saved to ${outputPath}`);
  console.log(`Cards: ${Object.keys(eloData).length}`);
  console.log(`ELO range: ${minElo.toFixed(1)} to ${maxElo.toFixed(1)}`);

  // Show top 10
  const sorted = Object.entries(eloData)
    .sort((a, b) => b[1].elo - a[1].elo)
    .slice(0, 10);

  console.log('\nTop 10 by ELO:');
  sorted.forEach(([name, data], i) => {
    console.log(`${i + 1}. ${data.elo.toFixed(0)} - ${name}`);
  });
}

fetchEloData().catch(console.error);
