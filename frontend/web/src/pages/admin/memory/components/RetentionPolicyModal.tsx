/**
 * RetentionPolicyModal — L1/L2/L3 保留策略编辑。
 */
import { useState } from 'react';
import { CheckCircle2, Settings, X } from 'lucide-react';
import type { RetentionPolicy } from '@/api/admin/memory/schema';
import { EVICTION_LABEL } from './constants';

export function RetentionPolicyModal({ open, onClose, policy, onSave }: {
  open: boolean; onClose: () => void; policy: RetentionPolicy | null; onSave: (next: RetentionPolicy) => void;
}) {
  const [draft, setDraft] = useState<RetentionPolicy | null>(policy);
  if (!open || !policy || !draft) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 sm:items-center sm:p-8" role="dialog" aria-modal="true" aria-label="保留策略" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="my-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:my-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold"><Settings className="h-5 w-5 text-blue-700" />{policy.label} · 保留策略</div>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold">TTL (分钟)</span>
              <input type="number" min={1} value={draft.ttlMinutes} onChange={(event) => setDraft({ ...draft, ttlMinutes: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{policy.layer === 'l1' ? '建议 30-1440 分钟' : policy.layer === 'l2' ? '建议 1-180 天' : '建议 30-365 天'}</p>
            </label>
            <label className="block">
              <span className="text-xs font-semibold">最大条目</span>
              <input type="number" min={1} value={draft.maxItems} onChange={(event) => setDraft({ ...draft, maxItems: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold">存储上限 (MB)</span>
              <input type="number" min={1} value={draft.storageMb} onChange={(event) => setDraft({ ...draft, storageMb: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold">淘汰策略</span>
              <select value={draft.eviction} onChange={(event) => setDraft({ ...draft, eviction: event.target.value as RetentionPolicy['eviction'] })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
                {(['lru', 'fifo', 'confidence'] as const).map((k) => <option key={k} value={k}>{EVICTION_LABEL[k]}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <p className="font-semibold">当前命中率 · {(policy.hitRate * 100).toFixed(1)}%</p>
            <p className="mt-1">调整策略后 24 小时内重新统计,届时会推送差异报告。</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">取消</button>
          <button type="button" onClick={() => onSave(draft)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <CheckCircle2 className="h-3.5 w-3.5" />保存策略
          </button>
        </div>
      </div>
    </div>
  );
}