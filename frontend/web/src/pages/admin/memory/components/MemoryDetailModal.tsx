/**
 * MemoryDetailModal — L1/L2/L3 通用详情 modal,根据 entry.kind 切换内容。
 */
import { ArrowUpRight, CheckCircle2, ChevronRight, Edit, Pause, Play, X } from 'lucide-react';
import type {
  L1Session, L2Fact, L3Entry, MemoryLayer,
} from '@/api/admin/memory/schema';
import { L1_STATUS_BADGE, L2_CATEGORY_LABEL, L2_STATUS_BADGE, L3_STATUS_BADGE, LAYER_META, toneClass } from './constants';

export type DetailEntry = { kind: 'l1' | 'l2' | 'l3'; data: L1Session | L2Fact | L3Entry };

export function MemoryDetailModal({ entry, onClose, onPromote, onConfirm, onRetire, onPublish }: {
  entry: DetailEntry;
  onClose: () => void;
  onPromote?: () => void;
  onConfirm?: () => void;
  onRetire?: () => void;
  onPublish?: () => void;
}) {
  const layer = entry.kind as MemoryLayer;
  const meta = LAYER_META[layer];
  const Icon = meta.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 sm:items-center sm:p-8" role="dialog" aria-modal="true" aria-label="记忆详情" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="my-4 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:my-0" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass[meta.tone]}`}><Icon className="h-4 w-4" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{meta.label}</p>
              <p className="text-sm font-semibold">记忆详情 · {entry.kind === 'l1' ? '会话' : entry.kind === 'l2' ? '长期事实' : '团队知识'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭详情" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          {entry.kind === 'l1' && (() => {
            const s = entry.data as L1Session;
            return (
              <>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">会话 sess-{s.id.split('-')[1].padStart(3, '0')}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.userName} · {s.agentName} · 开始 {s.startedAt}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat label="缓冲条数" value={String(s.bufferSize)} />
                  <Stat label="Tokens" value={s.tokensUsed.toLocaleString()} />
                  <Stat label="TTL" value={`剩 ${s.ttlRemainMin}/${s.ttlMinutes} 分`} />
                  <Stat label="状态" value={L1_STATUS_BADGE[s.status].label} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs font-semibold">最近 3 轮对话 · 摘要</p>
                  <div className="mt-3 space-y-2 text-xs leading-6 text-slate-700 dark:text-slate-200">
                    <p className="rounded-md bg-white p-2 dark:bg-slate-900"><span className="font-semibold text-blue-700">用户:</span> 请帮我看看这个退款流程怎么处理。</p>
                    <p className="rounded-md bg-white p-2 dark:bg-slate-900"><span className="font-semibold text-blue-700">助手:</span> 根据客服团队发布的价格折扣规则,7 天内订单支持全额退款;需要主管审批。</p>
                    <p className="rounded-md bg-white p-2 dark:bg-slate-900"><span className="font-semibold text-blue-700">用户:</span> 如果客户已经用了部分权益呢?</p>
                  </div>
                </div>
              </>
            );
          })()}
          {entry.kind === 'l2' && (() => {
            const f = entry.data as L2Fact;
            return (
              <>
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{L2_CATEGORY_LABEL[f.category]}</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{f.key}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">归属 {f.userName} · 来源 sess-{f.sourceSession.split('-')[1].padStart(3, '0')} · {f.promotedAt}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{f.value}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="置信度" value={`${(f.confidence * 100).toFixed(0)}%`} />
                  <Stat label="最后使用" value={f.lastUsed} />
                  <Stat label="已晋升 L3" value={f.promotedToL3 ? '是' : '否'} />
                </div>
              </>
            );
          })()}
          {entry.kind === 'l3' && (() => {
            const k = entry.data as L3Entry;
            return (
              <>
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{k.team} · {k.category}</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{k.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">贡献者 {k.contributor} · 更新 {k.updatedAt}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{k.summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="命中次数" value={String(k.hits)} />
                  <Stat label="状态" value={L3_STATUS_BADGE[k.status].label} />
                  <Stat label="引用方式" value="RAG 检索" />
                </div>
              </>
            );
          })()}
        </div>
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700">
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />返回列表
            </button>
            <div className="flex flex-wrap gap-2">
              {entry.kind === 'l2' && (entry.data as L2Fact).status === 'pending' && onConfirm && (
                <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />确认入库
                </button>
              )}
              {entry.kind === 'l2' && (entry.data as L2Fact).status === 'confirmed' && !(entry.data as L2Fact).promotedToL3 && onPromote && (
                <button type="button" onClick={onPromote} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <ArrowUpRight className="h-3.5 w-3.5" />晋升到 L3
                </button>
              )}
              {entry.kind === 'l3' && (entry.data as L3Entry).status === 'draft' && onPublish && (
                <button type="button" onClick={onPublish} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <Play className="h-3.5 w-3.5" />发布
                </button>
              )}
              {entry.kind === 'l3' && (entry.data as L3Entry).status === 'published' && onRetire && (
                <button type="button" onClick={onRetire} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:border-rose-400 dark:border-rose-500/40 dark:text-rose-300">
                  <Pause className="h-3.5 w-3.5" />下线
                </button>
              )}
              <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
                <Edit className="h-3.5 w-3.5" />编辑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}