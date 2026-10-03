/**
 * ModelCard — 运行指标列表行。
 */
import { Download } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn,
} from '@/components/feedback/AdminListRow';
import type { ModelMetric } from '../schema';
import { SEVERITY_META } from './constants';

function severity(availability: number, errorRate: number): 'good' | 'warn' | 'bad' {
  if (availability < 99.5 || errorRate >= 1) return 'bad';
  if (availability < 99.8 || errorRate >= 0.5) return 'warn';
  return 'good';
}

interface ModelCardProps {
  model: ModelMetric;
  onSelect: (model: ModelMetric) => void;
  onExportOne: (model: ModelMetric) => void;
}

export function ModelCard({ model, onSelect, onExportOne }: ModelCardProps) {
  const sev = severity(model.availability, model.errorRate);
  const meta = SEVERITY_META[sev];
  return (
    <AdminListRow hasCheckbox={false} hasStar={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(model)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(model);
          }
        }}
        aria-label={`查看 ${model.model} 详情`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{model.model}</div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{model.provider}</div>
      </AdminListIdentity>
      <AdminListMetrics cols={4}>
        <AdminListMetric>{model.availability.toFixed(2)}%</AdminListMetric>
        <AdminListMetric>{model.p95}ms</AdminListMetric>
        <AdminListMetric>{model.errorRate}%</AdminListMetric>
        <AdminListMetric>{(model.calls / 1000).toFixed(1)}k 调用</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" onClick={(event) => { event.stopPropagation(); onExportOne(model); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
