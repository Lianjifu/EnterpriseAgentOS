/**
 * Skill / Tool / MCP 三个模板 Tab 共用的展示面板。
 */
import type { TemplateSeed } from '@/api/admin/skills/schema';
import { TemplateCard } from './templates';

interface TemplateTabPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  eyebrowTone?: 'violet' | 'amber' | 'sky';
  templates: TemplateSeed[];
  onAdd: (template: TemplateSeed) => void;
}

const TONE_MAP: Record<NonNullable<TemplateTabPanelProps['eyebrowTone']>, string> = {
  violet: 'text-violet-700 dark:text-violet-300',
  amber: 'text-amber-700 dark:text-amber-300',
  sky: 'text-sky-700 dark:text-sky-300',
};

export function TemplateTabPanel({ eyebrow, title, description, eyebrowTone = 'violet', templates, onAdd }: TemplateTabPanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${TONE_MAP[eyebrowTone]}`}>{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => <TemplateCard key={tpl.id} template={tpl} onAdd={onAdd} />)}
      </div>
    </section>
  );
}