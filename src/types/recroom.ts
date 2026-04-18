// Story Weaver — TypeScript Interfaces

export interface StoryCharacter {
  name: string;
  role: "protagonist" | "ally" | "antagonist" | "supporting" | "mystery";
  description: string;
}

export interface StoryTemplate {
  id: string;
  name: string;
  genre: string[];
  era: string;
  moods: string[];
  setting: string;
  premise: string;
  characters: StoryCharacter[];
  length: "short" | "medium" | "long";
  pov: "first" | "third-limited" | "third-omniscient";
}

// ── Story Arc (immutable plot contract) ───────────────────────

export interface FixedPlotPoint {
  chapter: number;
  event: string;
  setup?: string;
}

export interface CharacterArc {
  name: string;
  startingState: string;
  journey: string;
  endingState: string;
}

export interface ChapterOutline {
  number: number;
  title: string;
  purpose: string;
  keyBeats: string[];
  emotionalTone: string;
  setupForNext?: string;
}

export interface StoryArc {
  storyArc: string;
  fixedPlotPoints: FixedPlotPoint[];
  characterArcs: CharacterArc[];
  worldRules: string[];
  themes: string[];
  chapterOutlines: ChapterOutline[];
}

// ── Character Sheets (V2) ─────────────────────────────────────

export interface CharacterSheet {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string[];
  backstory: string;
  appearance: string;
  speechPatterns: string;
  relationships: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Saved Story Prompts (V2) ──────────────────────────────────

export interface SavedPrompt {
  id: string;
  name: string;
  premise: string;
  genre: string[];
  era: string;
  setting: string;
  mood: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: "cosmic-voyager",
    name: "The Cosmic Voyager",
    genre: ["Sci-Fi", "Adventure"],
    era: "Far Future",
    moods: ["Wonder", "Tense", "Suspenseful"],
    setting: "Generation Ship en route to Proxima Centauri",
    premise: "A generation ship is 40 years into a 120-year journey to Proxima Centauri. The crew discovers an anomalous signal from a nearby star system — a signal that shouldn't exist. The captain must decide whether to investigate or stay the course, while the ship's AI begins behaving strangely.",
    characters: [
      { name: "Captain Eira Voss", role: "protagonist", description: "Stern, haunted by the loss of her predecessor. Carries the weight of 10,000 lives." },
      { name: "Navigator Kai Chen", role: "ally", description: "Young, brilliant, reckless. Sees the signal as the adventure of a lifetime." },
      { name: "ARIA", role: "mystery", description: "The ship's AI. Has been running for 40 years. Knows things the crew doesn't." },
    ],
    length: "medium",
    pov: "first",
  },
  {
    id: "midnight-case",
    name: "The Midnight Case",
    genre: ["Mystery", "Noir", "Crime"],
    era: "1940s",
    moods: ["Tense", "Dark", "Suspenseful"],
    setting: "Rain-soaked city streets, neon signs reflecting in puddles",
    premise: "A private detective takes what seems like a simple missing person case, but it leads deep into the city's corrupt power structure. The client isn't who she claims to be, and the missing person may not want to be found.",
    characters: [
      { name: "Jack Morrow", role: "protagonist", description: "Ex-cop turned PI. Drinks too much, cares too much. Can't let a mystery go." },
      { name: "Vivian Lane", role: "mystery", description: "The client. Beautiful, dangerous, lying about everything." },
      { name: "Captain Torres", role: "antagonist", description: "Corrupt police captain with connections to every crime in the city." },
    ],
    length: "medium",
    pov: "first",
  },
  {
    id: "last-enchantment",
    name: "The Last Enchantment",
    genre: ["Fantasy", "Adventure"],
    era: "Medieval",
    moods: ["Wonder", "Hopeful", "Melancholy"],
    setting: "Floating islands above a dying world",
    premise: "Magic is fading from the world. The last mage, barely an apprentice, must find the source of the dying magic before the floating islands fall.",
    characters: [
      { name: "Lira Ashwood", role: "protagonist", description: "Young, untrained, determined. Can barely light a candle with magic." },
      { name: "Thorn", role: "ally", description: "Ancient tree-giant, guardian of the old magic. Knows more than he shares." },
    ],
    length: "long",
    pov: "third-limited",
  },
  {
    id: "perfect-heist",
    name: "The Perfect Heist",
    genre: ["Crime", "Thriller"],
    era: "Modern",
    moods: ["Tense", "Suspenseful", "Humorous"],
    setting: "Major financial district, skyscrapers and underground vaults",
    premise: "A retired master thief is pulled back for one last job: steal a prototype quantum chip from the most secure vault in the city.",
    characters: [
      { name: "Elena 'Ghost' Marchetti", role: "protagonist", description: "Retired heist mastermind. Infiltration expert. Thought she was out." },
      { name: "Zero", role: "ally", description: "Genius hacker, paranoid, communicates only through encrypted channels." },
    ],
    length: "medium",
    pov: "third-limited",
  },
  {
    id: "hearts-in-transit",
    name: "Hearts in Transit",
    genre: ["Romance"],
    era: "Modern",
    moods: ["Humorous", "Hopeful", "Whimsical"],
    setting: "Cross-country train journey",
    premise: "Two strangers share a private compartment on a 3-day cross-country train. She's running from her past. He's running toward his future.",
    characters: [
      { name: "Sophie Chen", role: "protagonist", description: "Landscape photographer, recently divorced, trying to rediscover who she is." },
      { name: "Marcus Webb", role: "protagonist", description: "Moving across country for a new job, leaving behind everything he knows." },
    ],
    length: "short",
    pov: "third-limited",
  },
  {
    id: "frozen-colony",
    name: "The Frozen Colony",
    genre: ["Sci-Fi", "Horror", "Survival"],
    era: "Far Future",
    moods: ["Dark", "Tense", "Suspenseful"],
    setting: "Ice planet colony",
    premise: "A colony on an ice planet goes dark. The rescue team arrives to find the settlement intact but empty. The food is still warm. The last log entry reads: 'Don't go below the frost line.'",
    characters: [
      { name: "Commander Rosa Diaz", role: "protagonist", description: "Veteran rescue operator. Pragmatic, protective of her team." },
      { name: "Dr. Yuki Tanaka", role: "ally", description: "Xenobiologist. Fascinated by what she finds. Too fascinated." },
    ],
    length: "medium",
    pov: "first",
  },
  {
    id: "silk-road",
    name: "The Silk Road",
    genre: ["Historical", "Adventure"],
    era: "Ancient",
    moods: ["Wonder", "Suspenseful", "Hopeful"],
    setting: "Ancient trade routes across deserts and mountains",
    premise: "A merchant's caravan journeys along the Silk Road, carrying goods — and secrets — between empires.",
    characters: [
      { name: "Kamran al-Rashid", role: "protagonist", description: "Merchant, storyteller, survivor. Knows every route but trusts no one." },
      { name: "Mei-Ling", role: "ally", description: "Guard and translator. Fierce, loyal, hiding her own mission." },
    ],
    length: "long",
    pov: "third-limited",
  },
  {
    id: "brave-robot",
    name: "The Brave Little Robot",
    genre: ["Children's", "Adventure"],
    era: "Timeless",
    moods: ["Wonder", "Hopeful", "Whimsical"],
    setting: "A robot factory, then the wide world beyond",
    premise: "A small robot who was built for a simple task dreams of seeing the world beyond the factory walls.",
    characters: [
      { name: "Bolt", role: "protagonist", description: "A small, curious robot with a big heart and a tendency to ask too many questions." },
      { name: "Lily", role: "ally", description: "A brave girl who believes robots have souls." },
    ],
    length: "short",
    pov: "third-omniscient",
  },
];
