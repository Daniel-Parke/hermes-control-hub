// ═══════════════════════════════════════════════════════════════
// Mission template record (prompt-building blocks; distinct from UI MissionTemplate)
// ═══════════════════════════════════════════════════════════════

export interface TemplateDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  profile: string;
  description: string;
  instruction: string;
  context: string;
  goals: string[];
  suggestedSkills: string[];
}
