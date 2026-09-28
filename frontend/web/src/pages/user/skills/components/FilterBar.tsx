import { Search } from 'lucide-react';
import type { CapabilityStatus, CapabilityType, SkillListParams } from '@/api/user/skills/schema';

interface FilterBarProps {
  params: SkillListParams;
  onChange: (next: SkillListParams) => void;
}

const TYPE_TABS: Array<'all' | CapabilityType> = ['all', 'Skill', 'Tool', 'MCP'];
const TYPE_LABEL: Record<'all' | CapabilityType, string> = {
  all: '全部', Skill: 'Skill', Tool: 'Tool', MCP: 'MCP',
};

export function FilterBar({ params, onChange }: FilterBarProps) {
  return (
    <>
      <div role="tablist" aria-label="能力类型" className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
        {TYPE_TABS.map((item) => {
          const active = (params.type ?? 'all') === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ ...params, type: item })}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${active ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
            >
              {TYPE_LABEL[item]}
            </button>
          );
        })}
      </div>
      <label className="sr-only" htmlFor="skills-status">按状态筛选</label>
      <select
        id="skills-status"
        value={params.status ?? 'all'}
        onChange={(event) => onChange({ ...params, status: event.target.value as 'all' | CapabilityStatus })}
        className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
      >
        <option value="all">全部状态</option>
        <option value="available">可使用</option>
        <option value="unavailable">暂不可用</option>
      </select>
      <button
        type="button"
        aria-pressed={Boolean(params.onlyFavorites)}
        onClick={() => onChange({ ...params, onlyFavorites: !params.onlyFavorites })}
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${params.onlyFavorites ? 'border-rose-300 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
      >
        <Search className="h-3.5 w-3.5" />
        我的收藏
      </button>
    </>
  );
}