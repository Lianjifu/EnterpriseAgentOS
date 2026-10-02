/**
 * 新增数据源 — 页面 body(由 SourceCreatePage 包裹)。
 *
 * 历史上曾是 CenterModal 弹窗;现已迁到独立页面 /admin/knowledge/sources/new。
 * 本组件只渲染单步表单 + 底栏,没有外层 dialog wrapper。
 */
import { useState } from 'react';
import type { SourceType, CreateSourceVars } from '../schema';
import { SOURCE_TYPE_META } from './constants';

const TYPE_OPTIONS: SourceType[] = ['notion', 'slack', 'web', 'postgres', 's3', 'api', 'folder', 'confluence'];
const SCHEDULES = ['每 30 分钟', '每 1 小时', '每 6 小时', '每 12 小时', '每天 02:00', '手动'];

export default function SourceCreateModal({
  onCancel,
  onSubmit,
  isPending,
}: {
  onCancel: () => void;
  onSubmit: (vars: CreateSourceVars) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('notion');
  const [schedule, setSchedule] = useState('每 1 小时');

  const valid = name.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">名称</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例:产品 Wiki" className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">类型</span>
          <select value={type} onChange={(e) => setType(e.target.value as SourceType)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{SOURCE_TYPE_META[t].icon} {SOURCE_TYPE_META[t].label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">同步频率</span>
          <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none">
            {SCHEDULES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={onCancel} className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          取消
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ name: name.trim(), type, schedule })}
          disabled={!valid || isPending}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? '创建中…' : '创建数据源'}
        </button>
      </div>
    </div>
  );
}