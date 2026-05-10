export interface Env {
  AI: Ai;
  VECTORIZE: Vectorize;
}

interface CardData {
  name: string;
  oracle_text: string;
  type_line: string;
  mana_cost?: string;
  keywords?: string[];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Create embedding text from card data
function cardToText(card: CardData): string {
  const parts = [
    card.name,
    card.type_line,
    card.oracle_text || '',
    card.keywords?.join(', ') || '',
  ];
  return parts.filter(Boolean).join('. ');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        return json({ status: 'ok' });
      }

      // Seed embeddings for all cards
      if (url.pathname === '/seed' && request.method === 'POST') {
        const { cards } = await request.json() as { cards: CardData[] };

        if (!cards || !Array.isArray(cards)) {
          return json({ error: 'cards array required' }, 400);
        }

        const results: { name: string; success: boolean }[] = [];

        // Process in batches of 10 to avoid rate limits
        for (let i = 0; i < cards.length; i += 10) {
          const batch = cards.slice(i, i + 10);

          // Generate embeddings for batch
          const texts = batch.map(cardToText);
          const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: texts,
          });

          // Insert into Vectorize
          const vectors = batch.map((card, idx) => ({
            id: card.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            values: (embeddings as { data: number[][] }).data[idx],
            metadata: {
              name: card.name,
              type_line: card.type_line,
              oracle_text: card.oracle_text || '',
            },
          }));

          await env.VECTORIZE.upsert(vectors);

          results.push(...batch.map(c => ({ name: c.name, success: true })));
        }

        return json({
          success: true,
          count: results.length,
          message: `Embedded ${results.length} cards`
        });
      }

      // Check similarity between two cards
      if (url.pathname === '/similarity' && request.method === 'POST') {
        const { card1, card2 } = await request.json() as { card1: CardData; card2: CardData };

        if (!card1 || !card2) {
          return json({ error: 'card1 and card2 required' }, 400);
        }

        // Generate embeddings for both cards
        const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [cardToText(card1), cardToText(card2)],
        });

        const data = (embeddings as { data: number[][] }).data;

        // Calculate cosine similarity
        const dotProduct = data[0].reduce((sum, a, i) => sum + a * data[1][i], 0);
        const magnitude1 = Math.sqrt(data[0].reduce((sum, a) => sum + a * a, 0));
        const magnitude2 = Math.sqrt(data[1].reduce((sum, a) => sum + a * a, 0));
        const similarity = dotProduct / (magnitude1 * magnitude2);

        // Determine synergy based on similarity threshold
        // 0.72+ = strong synergy, 0.65-0.72 = moderate, below = weak
        const hasSynergy = similarity >= 0.65;
        const strength = similarity >= 0.72 ? 'strong' : similarity >= 0.65 ? 'moderate' : 'weak';

        return json({
          similarity: Math.round(similarity * 1000) / 1000,
          hasSynergy,
          strength,
          card1: card1.name,
          card2: card2.name,
        });
      }

      // Find similar cards to a given card
      if (url.pathname === '/similar' && request.method === 'POST') {
        const { card, limit = 10 } = await request.json() as { card: CardData; limit?: number };

        if (!card) {
          return json({ error: 'card required' }, 400);
        }

        // Generate embedding for the card
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [cardToText(card)],
        });

        const vector = (embedding as { data: number[][] }).data[0];

        // Query Vectorize for similar cards
        const results = await env.VECTORIZE.query(vector, {
          topK: limit + 1, // +1 because the card itself might be in there
          returnMetadata: 'all',
        });

        // Filter out the card itself and format results
        const similar = results.matches
          .filter(m => m.metadata?.name !== card.name)
          .slice(0, limit)
          .map(m => ({
            name: m.metadata?.name,
            type_line: m.metadata?.type_line,
            similarity: Math.round(m.score * 1000) / 1000,
          }));

        return json({ card: card.name, similar });
      }

      // Semantic search
      if (url.pathname === '/search' && request.method === 'POST') {
        const { query, limit = 10 } = await request.json() as { query: string; limit?: number };

        if (!query) {
          return json({ error: 'query required' }, 400);
        }

        // Generate embedding for the query
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [query],
        });

        const vector = (embedding as { data: number[][] }).data[0];

        // Query Vectorize
        const results = await env.VECTORIZE.query(vector, {
          topK: limit,
          returnMetadata: 'all',
        });

        const matches = results.matches.map(m => ({
          name: m.metadata?.name,
          type_line: m.metadata?.type_line,
          oracle_text: m.metadata?.oracle_text,
          score: Math.round(m.score * 1000) / 1000,
        }));

        return json({ query, matches });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Error:', error);
      return json({ error: String(error) }, 500);
    }
  },
};
