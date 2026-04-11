// ═══════════════════════════════════════════════════════════════
// Rec Room — TypeScript Interfaces
// ═══════════════════════════════════════════════════════════════

import type { AccentColor } from "@/types/hermes";

// ── Activity Types ───────────────────────────────────────────

export type RecRoomActivity =
  | "creative-canvas"
  | "ascii-studio"
  | "story-weaver";

export interface ActivityMeta {
  id: RecRoomActivity;
  name: string;
  description: string;
  icon: string;
  accentColor: AccentColor;
  longDescription: string;
  examples: string[];
}

// ── API Actions ──────────────────────────────────────────────

export type RecRoomAction =
  | "enhance"
  | "generate"
  | "refine"
  | "convert"
  | "save"
  | "load"
  | "list"
  | "delete";

export interface RecRoomRequest {
  action: RecRoomAction;
  activity: RecRoomActivity;
  prompt?: string;
  context?: Record<string, unknown>;
  enhancedPrompt?: string;
  previousOutput?: string;
  refinement?: string;
  imageData?: string;
  name?: string;
  id?: string;
}

// ── Enhancement Response ─────────────────────────────────────

export interface EnhanceResponse {
  interpretation: string;
  techniques: string[];
  options: EnhancementOption[];
}

export interface EnhancementOption {
  label: string;
  description: string;
  params: Record<string, unknown>;
}

// ── Generation Response ──────────────────────────────────────

export interface GenerateResponse {
  output: string;
  format: "html" | "text" | "code" | "json";
  metadata?: Record<string, unknown>;
}

// ── Creative Canvas ──────────────────────────────────────────

export interface CanvasOptions {
  style: "realistic" | "abstract" | "minimal" | "cyberpunk" | "organic";
  palette: string;
  speed: number;       // 1-5
  complexity: number;  // 1-5
  interactivity: ("mouse" | "keyboard" | "auto")[];
}

export const DEFAULT_CANVAS_OPTIONS: CanvasOptions = {
  style: "abstract",
  palette: "neon",
  speed: 3,
  complexity: 3,
  interactivity: ["mouse"],
};

// ── ASCII Studio ─────────────────────────────────────────────

export type ASCIIMode = "text-banner" | "describe" | "upload";

export interface ASCIIOptions {
  mode: ASCIIMode;
  font: string;
  width: number;
  style: "classic" | "dense" | "sparse" | "braille" | "block";
  colorEnabled: boolean;
}

export const DEFAULT_ASCII_OPTIONS: ASCIIOptions = {
  mode: "describe",
  font: "slant",
  width: 80,
  style: "dense",
  colorEnabled: false,
};

export interface AnimationOptions {
  effect: "bounce" | "fade" | "wave" | "scroll" | "matrix" | "dissolve" | "pulse";
  speed: number;    // 1-5
  frames: number;
  loop: boolean;
}

// ── Story Weaver ─────────────────────────────────────────────

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
    premise: "Magic is fading from the world. The last mage, barely an apprentice, must find the source of the dying magic before the floating islands fall. An ancient guardian who has watched over the world for millennia offers to help — but has secrets of their own.",
    characters: [
      { name: "Lira Ashwood", role: "protagonist", description: "Young, untrained, determined. Can barely light a candle with magic, let alone save the world." },
      { name: "Thorn", role: "ally", description: "Ancient tree-giant, guardian of the old magic. Knows more than he shares." },
      { name: "The Hollow King", role: "antagonist", description: "A being of pure absence. Where he walks, magic dies." },
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
    premise: "A retired master thief is pulled back for one last job: steal a prototype quantum chip from the most secure vault in the city. The team is assembled, the plan is meticulous, but nothing goes according to plan.",
    characters: [
      { name: "Elena 'Ghost' Marchetti", role: "protagonist", description: "Retired heist mastermind. Infiltration expert. Thought she was out." },
      { name: "Zero", role: "ally", description: "Genius hacker, paranoid, communicates only through encrypted channels." },
      { name: "Director Park", role: "antagonist", description: "Head of security. Ex-military. Has been studying Elena's old jobs for years." },
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
    setting: "Cross-country train journey through changing landscapes",
    premise: "Two strangers share a private compartment on a 3-day cross-country train. She's running from her past. He's running toward his future. They have nothing in common except time, proximity, and a shared love of terrible train coffee.",
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
    setting: "Ice planet colony — frozen wasteland, underground tunnels",
    premise: "A colony on an ice planet goes dark. The rescue team arrives to find the settlement intact but empty. The food is still warm. The last log entry reads: 'Don't go below the frost line.'",
    characters: [
      { name: "Commander Rosa Diaz", role: "protagonist", description: "Veteran rescue operator. Pragmatic, protective of her team." },
      { name: "Dr. Yuki Tanaka", role: "ally", description: "Xenobiologist. Fascinated by what she finds. Too fascinated." },
      { name: "Sergeant Holt", role: "supporting", description: "Military escort. Doesn't trust scientists. Wants to leave immediately." },
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
    premise: "A merchant's caravan journeys along the Silk Road, carrying goods — and secrets — between empires. Bandits, sandstorms, and political intrigue threaten the journey at every turn.",
    characters: [
      { name: "Kamran al-Rashid", role: "protagonist", description: "Merchant, storyteller, survivor. Knows every route but trusts no one." },
      { name: "Mei-Ling", role: "ally", description: "Guard and translator. Fierce, loyal, hiding her own mission." },
      { name: "The Shadow", role: "antagonist", description: "A bandit leader who seems to know the caravan's every move." },
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
    premise: "A small robot who was built for a simple task dreams of seeing the world beyond the factory walls. When a kind girl finds him, they set off together on an adventure to find the legendary Garden of Light.",
    characters: [
      { name: "Bolt", role: "protagonist", description: "A small, curious robot with a big heart and a tendency to ask too many questions." },
      { name: "Lily", role: "ally", description: "A brave girl who believes robots have souls. Bolt's best friend." },
      { name: "The Factory Manager", role: "antagonist", description: "Wants all robots to stay in their assigned roles. No exceptions." },
    ],
    length: "short",
    pov: "third-omniscient",
  },
];

export interface StoryConfig {
  premise: string;
  genre: string;
  setting: string;
  era: string;
  mood: string[];
  language: string;
  characters: StoryCharacter[];
  length: "short" | "medium" | "long";
  pacing: number;       // 1-5
  complexity: number;   // 1-5
  pov: "first" | "third-limited" | "third-omniscient";
  arc: string;
}

export interface StoryCharacter {
  name: string;
  role: "protagonist" | "ally" | "antagonist" | "supporting" | "mystery";
  description: string;
}

export interface StoryChapter {
  title: string;
  summary: string;
  themes: string[];
  key_events?: string[];
  emotional_beat?: string;
  deviation_hooks?: string[];
}

export interface StoryOutline {
  title: string;
  premise?: string;
  chapters: StoryChapter[];
  character_notes?: string[];
  world_rules?: string[];
}

export interface StoryChapterStatus {
  number: number;
  title: string;
  status: "pending" | "writing" | "complete" | "failed";
  wordCount: number;
  generatedAt: string | null;
  funnyStatus?: string;
}

export const CHAPTER_STATUSES: Record<string, string> = {
  pending: "Waiting for its moment...",
  writing: "The muse is visiting...",
  complete: "The ink is still wet.",
  failed: "Fighting writer's block...",
};

export interface StoryPage {
  chapter: number;
  page: number;
  content: string;
  userDirection: string | null;
  branchId: string | null;
  generatedAt: string;
}

export interface StoryBranch {
  id: string;
  fromPage: { chapter: number; page: number };
  name: string;
  pages: StoryPage[];
}

export interface StoryContext {
  config: StoryConfig;
  outline: StoryOutline;
  recentPages: StoryPage[];
  summary: string;
  currentChapter: number;
  currentPage: number;
  userDirection?: string;
}

// ── Saved Items ──────────────────────────────────────────────

export interface SavedItem {
  id: string;
  activity: RecRoomActivity;
  name: string;
  prompt: string;
  enhancedPrompt: string | null;
  output: string;
  outputFormat: "html" | "text" | "code" | "json";
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

// ── Prompt Builder State ─────────────────────────────────────

export interface PromptBuilderState {
  prompt: string;
  isEnhancing: boolean;
  isGenerating: boolean;
  enhancedPrompt: string | null;
  enhancementResult: EnhanceResponse | null;
  selectedOption: number | null;
  showAdvanced: boolean;
}

// ── Component Props ──────────────────────────────────────────

export interface PromptBuilderProps {
  activity: RecRoomActivity;
  accentColor: AccentColor;
  placeholder: string;
  examples: string[];
  options?: React.ReactNode;
  onEnhance: (prompt: string) => void;
  onGenerate: (prompt: string, context?: Record<string, unknown>) => void;
  enhancing: boolean;
  generating: boolean;
  enhancementResult: EnhanceResponse | null;
  onSelectOption: (index: number) => void;
}

export interface OutputViewerProps {
  format: "html" | "text" | "code" | "json";
  content: string;
  accentColor: AccentColor;
  allowPause?: boolean;
  allowExport?: boolean;
  allowCodeView?: boolean;
  isPlaying?: boolean;
  onPause?: () => void;
  onReset?: () => void;
  onExport?: (format: string) => void;
  onRefine?: (refinement: string) => void;
}

export interface ActivityCardProps {
  activity: ActivityMeta;
  onClick: () => void;
}

export interface ActivityLayoutProps {
  activity: ActivityMeta;
  children: React.ReactNode;
}

export interface SavedItemCardProps {
  item: SavedItem;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, format: string) => void;
}

// ── Activity Registry ────────────────────────────────────────

export const REC_ROOM_ACTIVITIES: ActivityMeta[] = [
  {
    id: "creative-canvas",
    name: "Creative Canvas",
    description: "Generative visual art powered by p5.js",
    icon: "Palette",
    accentColor: "cyan",
    longDescription:
      "Create stunning interactive animations and generative art. From literal depictions to abstract concepts — describe what you want to see and watch it come to life.",
    examples: [
      "Animate our solar system with realistic orbits",
      "Show me what pain looks like",
      "Create a particle system that reacts to mouse movement",
      "Generate a flowing landscape of neon mountains",
    ],
  },
  {
    id: "ascii-studio",
    name: "ASCII Studio",
    description: "ASCII art, images, and animation",
    icon: "Terminal",
    accentColor: "green",
    longDescription:
      "The full ASCII art pipeline. Generate from text, convert images, create text banners with 571 fonts, and animate your creations with visual effects.",
    examples: [
      "Make me an ASCII art cat wearing a top hat",
      "Convert my photo to ASCII art",
      "Create a Matrix-style rain animation",
      "Generate a large banner saying HELLO WORLD",
    ],
  },
  {
    id: "story-weaver",
    name: "Story Weaver",
    description: "Collaborative interactive fiction",
    icon: "BookOpen",
    accentColor: "purple",
    longDescription:
      "Build stories collaboratively with AI. Define your world, characters, and themes — then navigate page-by-page, steering the narrative in any direction you choose.",
    examples: [
      "Write me a mystery set aboard a generation ship",
      "Create a fantasy adventure in a floating city",
      "A noir detective story set in 1940s Tokyo",
      "A children's story about a brave little robot",
    ],
  },
];
