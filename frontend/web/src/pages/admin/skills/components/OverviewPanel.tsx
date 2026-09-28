/**
 * 总览 Tab 内容 — 包含筛选条 + 技能卡片网格。
 * 把搜索 / 类型 / 状态 / 排序下沉到组件内,通过受控 props 与父组件通讯。
 */
import { Search } from 'lucide-react';
import type { AdminSkillFilters, Skill, SkillSortKey, SkillType, SkillStatus } from '@/api/admin/skills/schema';
import { SORT_OPTIONS, STATUS_OPTIONS, TYPE_FILTER_OPTIONS } from './constants';
import { SkillCard } from './SkillCard';

interface OverviewPanelProps {
  visible: Skill[];
  filters: AdminSkillFilters;
  onFiltersChange: (next: AdminSkillFilters) => void;
  counts: { total: number; published: number };
  selectedIds: string[];
  openMenuId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleMenu: (id: string | null) => void;
  onSelect: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onDuplicate: (skill: Skill) => void;
  onExportOne: (skill: Skill) => void;
  onRequestDelete: (skill: Skill) => void;
}

export function OverviewPanel({
  visible, filters, onFiltersChange, counts,
  selectedIds, openMenuId, onToggleSelect, onToggleStar, onToggleMenu,
  onSelect, onEdit, onDuplicate, onExportOne, onRequestDelete,
}: OverviewPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">技能目录</p>
            <h3 className="mt-2 text-lg font-semibold">技能目录</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">管理员已配置的技能 · {visible.length} 项结果 · 已发布 {counts.published} · 全部 {counts.total}</p>
          </div>
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <label className="sr-only" htmlFor="skills-search">搜索技能</label>
            <input
              id="skills-search"
              value={filters.q ?? ''}
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
              placeholder="搜索技能 / 标签"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="skills-type">按类型筛选</label>
          <select
            id="skills-type"
            value={filters.type ?? 'all'}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as 'all' | SkillType })}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
          >
            {TYPE_FILTER_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="skills-status">按状态筛选</label>
          <select
            id="skills-status"
            value={filters.status ?? 'all'}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as 'all' | SkillStatus })}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="skills-sort">排序</label>
          <select
            id="skills-sort"
            value={filters.sort ?? 'updated'}
            onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value as SkillSortKey })}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
          >
            {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>排序:{o.label}</option>)}
          </select>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              selected={selectedIds.includes(skill.id)}
              onToggleSelect={onToggleSelect}
              menuOpen={openMenuId === skill.id}
              onToggleMenu={onToggleMenu}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onExportOne={onExportOne}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
        {visible.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的技能</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或清除筛选。</p>
          </div>
        )}
      </div>
    </div>
  );
}