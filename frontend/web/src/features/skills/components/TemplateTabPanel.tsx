/**
 * Skill / Tool / MCP 三个模板 Tab 共用的展示面板。
 */
import { Download, Plus, Upload } from 'lucide-react';
import type { TemplateSeed } from '../schema';
import { TemplateCard } from './templates';

interface TemplateTabPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  eyebrowTone?: 'violet' | 'amber' | 'sky';
  templates: TemplateSeed[];
  onAdd: (template: TemplateSeed) => void;
  createLabel: string;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
}

const TONE_MAP: Record<NonNullable<TemplateTabPanelProps['eyebrowTone']>, string> = {
  violet: 'text-violet-700 dark:text-violet-300',
  amber: 'text-amber-700 dark:text-amber-300',
  sky: 'text-sky-700 dark:text-sky-300',
};

export function TemplateTabPanel({ eyebrow, title, description, eyebrowTone = 'violet', templates, onAdd, createLabel, onCreate, onImport, onExport }: TemplateTabPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${TONE_MAP[eyebrowTone]}`}>{eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onImport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <Upload className="h-3.5 w-3.5" />导入
          </button>
          <button type="button" onClick={onExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <Download className="h-3.5 w-3.5" />导出
          </button>
          <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Plus className="h-3.5 w-3.5" />{createLabel}
          </button>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => <TemplateCard key={tpl.id} template={tpl} onAdd={onAdd} />)}
      </div>
    </section>
  );
}