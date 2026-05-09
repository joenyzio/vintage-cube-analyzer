/**
 * Fetches all cube cards from Scryfall and saves them to a static JSON file.
 * Run with: npx tsx scripts/fetch-cards.ts
 */

const SCRYFALL_API = 'https://api.scryfall.com';

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCards() {
  console.log(`Fetching ${CUBE_CARDS.length} cards from Scryfall...`);

  const allCards: any[] = [];
  const notFound: string[] = [];
  const batches: string[][] = [];

  for (let i = 0; i < CUBE_CARDS.length; i += 75) {
    batches.push(CUBE_CARDS.slice(i, i + 75));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Fetching batch ${i + 1}/${batches.length} (${batch.length} cards)...`);

    const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifiers: batch.map(name => ({ name })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      allCards.push(...data.data);
      console.log(`  Got ${data.data.length} cards`);

      if (data.not_found?.length > 0) {
        const names = data.not_found.map((c: any) => c.name);
        notFound.push(...names);
        console.warn(`  Not found: ${names.join(', ')}`);
      }
    } else {
      console.error(`  Failed: ${response.status} ${response.statusText}`);
    }

    // Rate limit
    await delay(100);
  }

  // Fetch any not-found cards individually (handles split cards, etc.)
  if (notFound.length > 0) {
    console.log(`\nFetching ${notFound.length} cards individually...`);
    for (const name of notFound) {
      try {
        const response = await fetch(`${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`);
        if (response.ok) {
          const card = await response.json();
          allCards.push(card);
          console.log(`  Found: ${name}`);
        } else {
          console.warn(`  Still not found: ${name}`);
        }
        await delay(100);
      } catch (e) {
        console.error(`  Error fetching ${name}:`, e);
      }
    }
  }

  console.log(`\nTotal cards fetched: ${allCards.length}`);

  // Write to file
  const fs = await import('fs');
  const path = await import('path');

  const outputPath = path.join(process.cwd(), 'src', 'data', 'cards.json');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allCards, null, 2));
  console.log(`\nSaved to ${outputPath}`);
}

fetchCards().catch(console.error);
