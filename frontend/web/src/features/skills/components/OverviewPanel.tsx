/**
 * 总览 Tab 内容 — 包含筛选条 + 技能卡片网格。
 * 把搜索 / 类型 / 状态 / 排序下沉到组件内,通过受控 props 与父组件通讯。
 */
import { Plus, Search, Upload } from 'lucide-react';
import type { AdminSkillFilters, Skill, SkillType, SkillStatus } from '../schema';
import { STATUS_OPTIONS, TYPE_FILTER_OPTIONS } from './constants';
import { SkillCard } from './SkillCard';

interface OverviewPanelProps {
  visible: Skill[];
  filters: AdminSkillFilters;
  onFiltersChange: (next: AdminSkillFilters) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSelect: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onPublish: (skill: Skill) => void;
  onExportOne: (skill: Skill) => void;
  onRequestDelete: (skill: Skill) => void;
  createLabel: string;
  onCreate: () => void;
  onImport: () => void;
}

export function OverviewPanel({
  visible, filters, onFiltersChange,
  selectedIds, onToggleSelect, onToggleStar,
  onSelect, onEdit, onPublish, onExportOne, onRequestDelete,
  createLabel, onCreate, onImport,
}: OverviewPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="skills-search"
            aria-label="搜索技能"
            value={filters.q ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
            placeholder="搜索技能 / 标签"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
          />
        </label>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            id="skills-type"
            aria-label="类型"
            value={filters.type ?? 'all'}
            onChange={(event) => onFiltersChange({ ...filters, type: event.target.value as 'all' | SkillType })}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs outline-none focus:border-[var(--brand)]"
          >
            {TYPE_FILTER_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <select
            id="skills-status"
            aria-label="状态"
            value={filters.status ?? 'all'}
            onChange={(event) => onFiltersChange({ ...filters, status: event.target.value as 'all' | SkillStatus })}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs outline-none focus:border-[var(--brand)]"
          >
            {STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <div role="group" aria-label="列表操作" className="flex items-center gap-2">
            <button type="button" onClick={onImport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <Upload className="h-3.5 w-3.5" />导入
            </button>
            <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />{createLabel}
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              selected={selectedIds.includes(skill.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onPublish={onPublish}
              onExportOne={onExportOne}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
        {visible.length === 0 && (
          <div className="px-5 pb-8 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的技能</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或清除筛选。</p>
          </div>
        )}
    </div>
  );
}