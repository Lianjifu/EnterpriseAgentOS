/**
 * 用户侧「我的技能」类型 — 用户只读 + 收藏/标记最近使用。
 * AdminSkills 的 schema 见 `src/features/skills/schema.ts`,字段更丰富。
 */
export type CapabilityType = 'Skill' | 'Tool' | 'MCP';
export type CapabilityStatus = 'available' | 'unavailable';
export type CapabilityRisk = 'low' | 'needsConfirm';

export interface Capability {
  id: string;
  name: string;
  type: CapabilityType;
  description: string;
  owner: string;
  useCase: string;
  input: string;
  output: string;
  risk: CapabilityRisk;
  status: CapabilityStatus;
  tags: string[];
  lastUsed: string;
}

export interface SkillListFilters {
  type?: 'all' | CapabilityType;
  status?: 'all' | CapabilityStatus;
  q?: string;
  onlyFavorites?: boolean;
}

export interface SkillListParams extends SkillListFilters {
  workspaceId?: string;
}

export interface ToggleFavoriteVars {
  id: string;
  on: boolean;
}

export interface RecordUseVars {
  id: string;
  goal: string;
}