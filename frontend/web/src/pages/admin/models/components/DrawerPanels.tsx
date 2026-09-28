import { useState } from 'react';
import { X } from 'lucide-react';
import type { Model, RouteRule } from '@/api/admin/models/schema';
import { DRAWER_NAV_ITEMS, STATUS_BADGE, TASK_LABEL, TIER_LABEL, formatPrice } from './constants';
import { Sparkline } from './Primitives';

interface DrawerPanelsProps {
  model: Model;
  routes: RouteRule[];
  onChange: (patch: Partial<Model>) => void;
}

export function DrawerPanelDetail({ model, onChange }: { model: Model; onChange: (p: Partial<Model>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="模型名称">
          <input value={model.name} onChange={(e) => onChange({ name: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </Field>
        <Field label="提供商">
          <input value={model.providerName} readOnly className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-muted)]" />
        </Field>
        <Field label="能力">
          <div className="flex flex-wrap gap-1.5">
            {model.task.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">{TASK_LABEL[t]}</span>
            ))}
          </div>
        </Field>
        <Field label="层级">
          <select value={model.tier} onChange={(e) => onChange({ tier: e.target.value as Model['tier'] })} className="h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none">
            {(Object.keys(TIER_LABEL) as Array<keyof typeof TIER_LABEL>).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="描述">
        <textarea value={model.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
      </Field>
      <Field label="标签">
        <div className="flex flex-wrap gap-1.5">
          {model.tags.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">无标签</p>
          ) : model.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{t}</span>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function DrawerPanelParams({ model }: { model: Model }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="上下文窗口" value={`${(model.contextWindow / 1000).toLocaleString('zh-CN')}k`} />
        <Stat label="成功率" value={`${model.successRate}%`} tone={model.successRate < 98 ? 'warn' : 'ok'} />
        <Stat label="输入价 (per 1k)" value={formatPrice(model.priceIn, 'in')} />
        <Stat label="输出价 (per 1k)" value={formatPrice(model.priceOut, 'out')} />
        <Stat label="平均延迟" value={model.latencyMs ? `${model.latencyMs} ms` : '—'} />
        <Stat label="本月调用" value={model.calls.toLocaleString('zh-CN')} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">12 周趋势</p>
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <Sparkline values={model.trend} />
        </div>
      </div>
    </div>
  );
}

export function DrawerPanelRoute({ routes, modelId }: { routes: RouteRule[]; modelId: string }) {
  const refs = routes.filter((r) => r.primaryModelId === modelId || r.fallbackModelIds.includes(modelId));
  if (refs.length === 0) {
    return <p className="text-[11px] text-[var(--text-muted)]">此模型尚未被任何路由规则引用。</p>;
  }
  return (
    <ul className="space-y-2">
      {refs.map((r) => (
        <li key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs">
          <p className="font-semibold">{r.name}</p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            角色:{r.primaryModelId === modelId ? '主模型' : '降级模型'} · 任务:{TASK_LABEL[r.task]} · 优先级 {r.priority}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function DrawerPanelAudit({ model }: { model: Model }) {
  const entries = [
    { when: '2026-09-25 10:21', actor: '陈雪', action: '更新描述与标签' },
    { when: '2026-09-18 14:09', actor: '李哲', action: '调整输入价' },
    { when: '2026-09-02 09:30', actor: '陈雪', action: '启用灰度发布' },
  ];
  return (
    <ol className="space-y-2 text-xs">
      {entries.map((e) => (
        <li key={e.when} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <p className="text-[11px] text-[var(--text-muted)]">{e.when}</p>
          <p className="mt-1 font-semibold">{e.actor} · {e.action}</p>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  const color = tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : '';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

interface ModelDetailDrawerProps {
  model: Model | null;
  routes: RouteRule[];
  onClose: () => void;
  onChange: (patch: Partial<Model>) => void;
  onSave: () => void;
}

export function ModelDetailDrawer({ model, routes, onClose, onChange, onSave }: ModelDetailDrawerProps) {
  const [panel, setPanel] = useState<'detail' | 'params' | 'route' | 'audit'>('detail');
  if (!model) return null;
  const badge = STATUS_BADGE[model.status];
  return (
    <aside aria-label="模型详情" className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--surface-1)] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[var(--border)] p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">模型详情</p>
          <h3 className="mt-2 text-lg font-semibold">{model.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
            </span>
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{model.providerName}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--bg-elevated)]">
          <X className="h-4 w-4" />
        </button>
      </header>
      <nav className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        {DRAWER_NAV_ITEMS.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setPanel(it.id)}
            aria-pressed={panel === it.id}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${panel === it.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}
          >
            <it.icon className="h-3.5 w-3.5" />{it.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-5">
        {panel === 'detail' && <DrawerPanelDetail model={model} onChange={onChange} />}
        {panel === 'params' && <DrawerPanelParams model={model} />}
        {panel === 'route' && <DrawerPanelRoute routes={routes} modelId={model.id} />}
        {panel === 'audit' && <DrawerPanelAudit model={model} />}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
        <button type="button" onClick={onSave} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">保存修改</button>
      </footer>
    </aside>
  );
}
