export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity: string;
  set: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost: string;
    type_line: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
    };
  }>;
  prices?: {
    usd?: string;
    usd_foil?: string;
  };
  edhrec_rank?: number;
  legalities: Record<string, string>;
  produced_mana?: string[];
}

export interface CubeCard extends ScryfallCard {
  // Analysis properties
  archetypes: string[];
  powerLevel: number;
  draftPriority: number;
  synergyTags: string[];
  role: CardRole;
}

export type CardRole =
  | 'fast_mana'
  | 'removal'
  | 'counterspell'
  | 'card_advantage'
  | 'finisher'
  | 'combo_piece'
  | 'aggro_creature'
  | 'midrange_threat'
  | 'control_finisher'
  | 'enabler'
  | 'tutor'
  | 'reanimation_target'
  | 'land'
  | 'utility';

export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
export type ColorPair = `${Color}${Color}`;

export interface Archetype {
  id: string;
  name: string;
  colors: string[];
  description: string;
  keyCards: string[];
  strategy: string;
  powerRating: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  tips: string[];
}

export interface DraftStrategy {
  name: string;
  description: string;
  firstPickPriority: string[];
  signalCards: string[];
  avoidCards: string[];
  colorPreferences: string[];
}

export interface CubeAnalysis {
  totalCards: number;
  colorDistribution: Record<string, number>;
  manaCurve: Record<number, number>;
  typeDistribution: Record<string, number>;
  archetypes: Archetype[];
  powerCards: CubeCard[];
  draftStrategies: DraftStrategy[];
  colorPairSynergies: Record<string, number>;
}
