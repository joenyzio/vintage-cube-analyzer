// Seed the Vectorize index with all cube cards
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_URL = 'https://cube-vectors.jdnyzio.workers.dev';

async function seed() {
  // Load cards from the data file
  const cardsPath = join(__dirname, '..', 'src', 'data', 'cards.json');
  const cards = JSON.parse(readFileSync(cardsPath, 'utf-8'));

  console.log(`Loaded ${cards.length} cards`);

  // Extract only the fields we need for embedding
  const cardData = cards.map(card => ({
    name: card.name,
    oracle_text: card.oracle_text || '',
    type_line: card.type_line || '',
    mana_cost: card.mana_cost || '',
    keywords: card.keywords || [],
  }));

  console.log('Sending cards to worker for embedding...');

  // Send to worker in chunks to avoid timeout
  const CHUNK_SIZE = 50;
  let total = 0;

  for (let i = 0; i < cardData.length; i += CHUNK_SIZE) {
    const chunk = cardData.slice(i, i + CHUNK_SIZE);
    console.log(`Processing cards ${i + 1}-${Math.min(i + CHUNK_SIZE, cardData.length)}...`);

    const response = await fetch(`${WORKER_URL}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: chunk }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Error seeding chunk: ${error}`);
      continue;
    }

    const result = await response.json();
    total += result.count;
    console.log(`  Embedded ${result.count} cards (total: ${total})`);
  }

  console.log(`\nDone! Embedded ${total} cards total.`);
}

seed().catch(console.error);
