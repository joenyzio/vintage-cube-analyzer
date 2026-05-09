import { useState, useEffect } from 'react';
import type { ScryfallCard, CubeCard, Archetype, DraftStrategy } from '../types/card';
import { fetchCardsBatch } from '../services/scryfall';
import {
  analyzeCard,
  generateArchetypes,
  generateDraftStrategies,
  analyzeColorDistribution,
  analyzeManaCurve,
  analyzeTypeDistribution,
  getTopCardsByPower,
} from '../services/analysis';

// Card list from the cube
const CUBE_CARDS = [
  "Esper Sentinel", "Giver of Runes", "Guide of Souls", "Mother of Runes", "Ocelot Pride",
  "Thraben Inspector", "Cathar Commando", "Containment Priest", "Jacked Rabbit", "Lion Sash",
  "Luminarch Aspirant", "Phelia, Exuberant Shepherd", "Stoneforge Mystic", "Thalia, Guardian of Thraben",
  "Voice of Victory", "Adeline, Resplendent Cathar", "Elite Spellbinder", "Flickerwisp",
  "Loran of the Third Path", "Monastery Mentor", "Porcelain Legionnaire", "Recruiter of the Guard",
  "Skyclave Apparition", "White Plume Adventurer", "Palace Jailer", "Restoration Angel",
  "Seasoned Dungeoneer", "Solitude", "The Wandering Emperor", "Enlightened Tutor", "Ephemerate",
  "Path to Exile", "Swords to Plowshares", "Reprieve", "Oust", "Prismatic Ending", "Balance",
  "Council's Judgment", "Armageddon", "Wrath of God", "Portable Hole", "Staff of the Storyteller",
  "Parallax Wave", "Snapcaster Mage", "Thassa's Oracle", "Brazen Borrower", "Hullbreacher",
  "Spellseeker", "Tishana's Tidebinder", "True-Name Nemesis", "Displacer Kitten",
  "Phyrexian Metamorph", "Subtlety", "Urza, Lord High Artificer", "Kappa Cannoneer",
  "Narset, Parter of Veils", "Jace, the Mind Sculptor", "Ancestral Recall", "Brainstorm",
  "Mystical Tutor", "Spell Pierce", "Brain Freeze", "Counterspell", "Daze", "Flash",
  "Lose Focus", "Mana Drain", "Mana Leak", "Memory Lapse", "Miscalculation", "Remand", "Snap",
  "Force of Negation", "Frantic Search", "Force of Will", "Mystic Confluence", "Gitaxian Probe",
  "Ponder", "Preordain", "Time Walk", "Show and Tell", "Stock Up", "Timetwister", "Tinker",
  "Echo of Eons", "Time Spiral", "Upheaval", "Treachery", "Dark Confidant", "Dauthi Voidwalker",
  "Deep-Cavern Bat", "Emperor of Bones", "Orcish Bowmasters", "Barrowgoyf", "Grief",
  "Sheoldred, the Apocalypse", "Metamorphosis Fanatic", "Archon of Cruelty", "Griselbrand",
  "Liliana of the Veil", "Dark Ritual", "Entomb", "Fatal Push", "Vampiric Tutor", "Bitter Triumph",
  "Cabal Ritual", "Shallow Grave", "Sheoldred's Edict", "Dismember", "Snuff Out", "Bone Shards",
  "Duress", "Imperial Seal", "Inquisition of Kozilek", "Mind Twist", "Reanimate", "Thoughtseize",
  "Collective Brutality", "Demonic Tutor", "Exhume", "Hymn to Tourach", "Night's Whisper",
  "Doomsday", "Toxic Deluge", "Yawgmoth's Will", "Damnation", "Bolas's Citadel", "Animate Dead",
  "Necromancy", "Recurring Nightmare", "Dragon's Rage Channeler", "Goblin Welder",
  "Orcish Lumberjack", "Ragavan, Nimble Pilferer", "Embereth Shieldbreaker", "Fear of Missing Out",
  "Goblin Engineer", "Inti, Seneschal of the Sun", "Robber of the Rich", "Bonecrusher Giant",
  "Broadside Bombardiers", "Goblin Rabblemaster", "Gut, True Soul Zealot", "Imperial Recruiter",
  "Laelia, the Blade Reforged", "Seasoned Pyromancer", "Caves of Chaos Adventurer",
  "Headliner Scarlett", "Pyrogoyf", "Fury", "Inferno Titan", "Oliphaunt", "Chandra, Torch of Defiance",
  "Burst Lightning", "Galvanic Discharge", "Lightning Bolt", "Unholy Heat", "Abrade", "Incinerate",
  "Seething Song", "Through the Breach", "Fireblast", "Pyrokinesis", "Chain Lightning",
  "Faithless Looting", "Firebolt", "Flame Slash", "Wheel of Fortune", "Fiery Confluence",
  "Cori-Steel Cutter", "Underworld Breach", "Sneak Attack", "Arbor Elf", "Birds of Paradise",
  "Delighted Halfling", "Elvish Mystic", "Hexdrinker", "Ignoble Hierarch", "Llanowar Elves",
  "Noble Hierarch", "Badgermole Cub", "Bristly Bill, Spine Sower", "Lotus Cobra",
  "Rofellos, Llanowar Emissary", "Scavenging Ooze", "Scythecat Cub", "Springheart Nantuko",
  "Endurance", "Eternal Witness", "Ramunap Excavator", "Sentinel of the Nameless City", "Six",
  "Tireless Tracker", "Icetill Explorer", "Questing Beast", "Undermountain Adventurer",
  "Titania, Protector of Argoth", "Primeval Titan", "Vaultborn Tyrant", "Craterhoof Behemoth",
  "Woodfall Primus", "Worldspine Wurm", "Nissa, Who Shakes the World", "Crop Rotation",
  "Once Upon a Time", "Green Sun's Zenith", "Pest Infestation", "Channel", "Malevolent Rumble",
  "Natural Order", "Scapeshift", "Exploration", "Fastbond", "Oath of Druids",
  "Survival of the Fittest", "Sylvan Library", "Walking Ballista", "Phyrexian Revoker",
  "Scrawling Crawler", "Golos, Tireless Pilgrim", "Wurmcoil Engine", "Myr Battlesphere",
  "Blightsteel Colossus", "Emrakul, the Aeons Torn", "Triplicate Titan", "Tezzeret, Cruel Captain",
  "Black Lotus", "Chrome Mox", "Lion's Eye Diamond", "Lotus Petal", "Mana Crypt", "Mishra's Bauble",
  "Mox Diamond", "Mox Emerald", "Mox Jet", "Mox Opal", "Mox Pearl", "Mox Ruby", "Mox Sapphire",
  "Urza's Bauble", "Zuran Orb", "Chromatic Star", "Currency Converter", "Expedition Map",
  "Mana Vault", "Retrofitter Foundry", "Sensei's Divining Top", "Skullclamp", "Sol Ring",
  "Grim Monolith", "Lightning Greaves", "Umezawa's Jitte", "Winter Orb", "Basalt Monolith",
  "Coalition Relic", "Crucible of Worlds", "The One Ring", "Batterskull", "Memory Jar",
  "Coveted Jewel", "Kaldra Compleat", "Portal to Phyrexia", "Teferi, Time Raveler",
  "Fractured Identity", "Baleful Strix", "Psychic Frog", "Fire Covenant", "Chaos Defiler",
  "Mawloc", "Wrenn and Six", "Minsc & Boo, Timeless Heroes", "Torsten, Founder of Benalia",
  "Damn", "Lingering Souls", "Lurrus of the Dream-Den", "Vindicate", "Expressive Iteration",
  "Dack Fayden", "Lutri, the Spellchaser", "Vivi Ornitier", "Deathrite Shaman",
  "Grist, the Hunger Tide", "Life // Death", "Forth Eorlingas!", "Phlage, Titan of Fire's Fury",
  "Comet, Stellar Pup", "Nadu, Winged Wisdom", "Oko, Thief of Crowns", "Uro, Titan of Nature's Wrath",
  "Atraxa, Grand Unifier", "Flooded Strand", "Hallowed Fountain", "Meticulous Archive", "Tundra",
  "Polluted Delta", "Undercity Sewers", "Underground Sea", "Watery Grave", "Badlands",
  "Blood Crypt", "Bloodstained Mire", "Raucous Theater", "Commercial District", "Stomping Ground",
  "Taiga", "Wooded Foothills", "Lush Portico", "Savannah", "Temple Garden", "Windswept Heath",
  "Godless Shrine", "Marsh Flats", "Scrubland", "Shadowy Backstreet", "Scalding Tarn",
  "Steam Vents", "Thundering Falls", "Volcanic Island", "Bayou", "Overgrown Tomb",
  "Underground Mortuary", "Verdant Catacombs", "Arid Mesa", "Elegant Parlor", "Plateau",
  "Sacred Foundry", "Breeding Pool", "Hedge Maze", "Misty Rainforest", "Tropical Island",
  "Spara's Headquarters", "Raffine's Tower", "Xander's Lounge", "Ziatora's Proving Ground",
  "Jetmir's Garden", "Savai Triome", "Ketria Triome", "Indatha Triome", "Raugrin Triome",
  "Zagoth Triome", "Ancient Tomb", "Boseiju, Who Endures", "City of Brass", "City of Traitors",
  "Gaea's Cradle", "Karakas", "Library of Alexandria", "Mana Confluence", "Mishra's Workshop",
  "Prismatic Vista", "Shelldock Isle", "Starting Town", "Strip Mine", "Tolarian Academy",
  "Urza's Saga", "Wasteland", "Wan Shi Tong, Librarian", "Ugin, Eye of the Storms",
  "Troll of Khazad-dum", "Lorien Revealed"
];

export interface CubeData {
  cards: CubeCard[];
  archetypes: Archetype[];
  draftStrategies: DraftStrategy[];
  colorDistribution: Record<string, number>;
  manaCurve: Record<number, Record<string, number>>;
  typeDistribution: Record<string, number>;
  powerRankings: CubeCard[];
  loading: boolean;
  error: string | null;
  progress: number;
}

export function useCubeData(): CubeData {
  const [cards, setCards] = useState<CubeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setProgress(10);

        // Fetch card data from Scryfall
        const scryfallCards = await fetchCardsBatch(CUBE_CARDS);
        setProgress(60);

        // Analyze each card
        const analyzedCards = scryfallCards.map((card) => analyzeCard(card));
        setProgress(90);

        setCards(analyzedCards);
        setProgress(100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cube data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const archetypes = generateArchetypes(cards);
  const draftStrategies = generateDraftStrategies();
  const colorDistribution = analyzeColorDistribution(cards);
  const manaCurve = analyzeManaCurve(cards);
  const typeDistribution = analyzeTypeDistribution(cards);
  const powerRankings = getTopCardsByPower(cards, 30);

  return {
    cards,
    archetypes,
    draftStrategies,
    colorDistribution,
    manaCurve,
    typeDistribution,
    powerRankings,
    loading,
    error,
    progress,
  };
}
