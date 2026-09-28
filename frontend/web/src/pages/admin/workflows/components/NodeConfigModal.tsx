/**
 * NodeConfigModal — 节点高级配置弹窗(节点名 + 副标题 + 动态配置项)。
 */
import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { NODE_KIND_LABEL } from './constants';
import type { FlowNodeData } from '@/api/admin/workflows/schema';
import type { Node } from 'reactflow';

export function NodeConfigModal({ open, onClose, node: targetNode, onSave }: { open: boolean; onClose: () => void; node: Node<FlowNodeData> | null; onSave: (n: Node<FlowNodeData>) => void }) {
  const [draft, setDraft] = useState<Node<FlowNodeData> | null>(null);
  useEffect(() => { setDraft(targetNode); }, [targetNode]);

  if (!draft) {
    return (
      <CenterModal open={open} onClose={onClose} ariaLabel="节点高级配置" title="节点高级配置" panelClassName="max-w-lg" footer={<button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">关闭</button>}>
        <p className="text-xs text-[var(--text-muted)]">未选中任何节点</p>
      </CenterModal>
    );
  }

  const updateCfg = (k: string, v: string) => setDraft({ ...draft, data: { ...draft.data, config: { ...draft.data.config, [k]: v } } });
  const addCfg = () => setDraft({ ...draft, data: { ...draft.data, config: { ...draft.data.config, '': '' } } });

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="节点高级配置"
      title={`配置 · ${draft.data.label}`}
      description={`${NODE_KIND_LABEL[draft.data.kind]} · ${draft.data.subtitle}`}
      panelClassName="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={() => { onSave(draft); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Save className="h-3.5 w-3.5" />保存配置
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold">节点名</span>
            <input value={draft.data.label} onChange={(e) => setDraft({ ...draft, data: { ...draft.data, label: e.target.value } })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-sm outline-none focus:border-[var(--brand)]" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold">副标题</span>
            <input value={draft.data.subtitle} onChange={(e) => setDraft({ ...draft, data: { ...draft.data, subtitle: e.target.value } })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-sm outline-none focus:border-[var(--brand)]" />
          </label>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">配置项</p>
            <button type="button" onClick={addCfg} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[11px] font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <Plus className="h-3 w-3" />添加
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {Object.entries(draft.data.config).map(([k, v], i) => (
              <div key={`${k}-${i}`} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
                <input value={k} onChange={(e) => {
                  const newCfg = { ...draft.data.config };
                  delete newCfg[k];
                  newCfg[e.target.value] = v;
                  setDraft({ ...draft, data: { ...draft.data, config: newCfg } });
                }} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 text-xs outline-none focus:border-[var(--brand)]" />
                <input value={v} onChange={(e) => updateCfg(k, e.target.value)} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 text-xs outline-none focus:border-[var(--brand)]" />
                <button type="button" onClick={() => {
                  const newCfg = { ...draft.data.config };
                  delete newCfg[k];
                  setDraft({ ...draft, data: { ...draft.data, config: newCfg } });
                }} className="grid h-8 w-8 place-items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CenterModal>
  );
}