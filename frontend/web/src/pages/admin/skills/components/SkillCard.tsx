import {
  AlertTriangle, CheckSquare, Copy, Download, Edit3, MoreVertical, Sparkles, Square,
  Star, Trash2, Zap,
} from 'lucide-react';
import type { Skill } from '@/api/admin/skills/schema';
import { RISK_BADGE, STATUS_BADGE, TYPE_META, formatCalls } from './constants';

interface SkillCardProps {
  skill: Skill;
  onSelect: (skill: Skill) => void;
  onToggleStar: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  menuOpen: boolean;
  onToggleMenu: (id: string | null) => void;
  onEdit: (skill: Skill) => void;
  onDuplicate: (skill: Skill) => void;
  onExportOne: (skill: Skill) => void;
  onRequestDelete: (skill: Skill) => void;
}

export function SkillCard({
  skill, onSelect, onToggleStar, selected, onToggleSelect, menuOpen, onToggleMenu,
  onEdit, onDuplicate, onExportOne, onRequestDelete,
}: SkillCardProps) {
  const meta = TYPE_META[skill.type];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[skill.status];
  const riskBadge = RISK_BADGE[skill.risk];
  const RiskIcon = riskBadge.icon;
  const isInactive = skill.calls === 0;
  return (
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(skill)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(skill);
          }
        }}
        aria-label={`查看 ${skill.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start justify-between">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(skill.id);
          }}
          aria-label={selected ? `取消选择 ${skill.name}` : `选择 ${skill.name}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${
            selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={skill.starred ? '取消收藏' : '收藏'}
            aria-pressed={skill.starred}
            onClick={(event) => {
              event.stopPropagation();
              onToggleStar(skill.id);
            }}
            className={`grid h-9 w-9 place-items-center rounded-lg transition ${skill.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}
          >
            <Star className={`h-4 w-4 ${skill.starred ? 'fill-current' : ''}`} />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label="操作菜单"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu(menuOpen ? null : skill.id);
              }}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-30 w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" role="menuitem" onClick={() => { onEdit(skill); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Edit3 className="h-3.5 w-3.5" />编辑
                </button>
                <button type="button" role="menuitem" onClick={() => { onDuplicate(skill); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Copy className="h-3.5 w-3.5" />复制
                </button>
                <button type="button" role="menuitem" onClick={() => { onExportOne(skill); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Download className="h-3.5 w-3.5" />导出
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button type="button" role="menuitem" onClick={() => { onRequestDelete(skill); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15">
                  <Trash2 className="h-3.5 w-3.5" />删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">{meta.label} · {meta.subLabel} · {skill.owner}</p>
          <h4 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">{skill.name}</h4>
        </div>
      </div>
      <p className="relative z-10 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{skill.description}</p>
      {skill.tags.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{t}</span>
          ))}
        </div>
      )}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
          {badge.label} · {skill.version}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskBadge.className}`}>
          <RiskIcon className="h-3 w-3" />{riskBadge.label}
        </span>
      </div>
      {isInactive ? (
        <div className="relative z-10 text-[11px] text-[var(--text-muted)]">{skill.lastUpdate} · 等待评估</div>
      ) : (
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />调用 {formatCalls(skill.calls)}</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />评分 {skill.rating.toFixed(1)}</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />错误 {skill.errorRate.toFixed(2)}%</span>
        </div>
      )}
    </article>
  );
}