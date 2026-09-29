/**
 * VersionsTab — 所有 flows 的版本历史聚合表(从 publish tab 拆出)。
 *
 * 行 = 一个版本;列 = 工作流 + 版本号 + 时间 + 操作人 + 说明 + 状态。点行跳详情页。
 */
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import type { Flow, FlowStatus } from '@/api/admin/workflows/schema';
import { STATUS_BADGE } from '../constants';

interface VersionsTabProps {
  flows: Flow[];
}

interface VersionRow {
  flowId: string;
  flowName: string;
  v: string;
  at: string;
  operator: string;
  note: string;
  status: FlowStatus;
}

export function VersionsTab({ flows }: VersionsTabProps) {
  const rows: VersionRow[] = flows.flatMap((f) =>
    f.versions.map((v) => ({ flowId: f.id, flowName: f.name, v: v.v, at: v.at, operator: v.operator, note: v.note, status: f.status })),
  );
  // 最新版本在前(按 v 字符串简单比较)
  const sorted = rows.slice().sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-amber-600" />
            版本历史({rows.length})
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            汇总所有工作流的版本记录。点击行跳到对应工作流详情页。
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-10 text-center">
            <History className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">暂无版本记录</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">新建工作流或发布后会出现在这里。</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-3 font-semibold">工作流</th>
                  <th className="py-2 pr-3 font-semibold">版本</th>
                  <th className="py-2 pr-3 font-semibold">时间</th>
                  <th className="py-2 pr-3 font-semibold">操作人</th>
                  <th className="py-2 pr-3 font-semibold">说明</th>
                  <th className="py-2 font-semibold">状态</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const badge = STATUS_BADGE[row.status];
                  return (
                    <tr
                      key={`${row.flowId}-${row.v}-${idx}`}
                      className="cursor-pointer border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]"
                    >
                      <td className="py-2.5 pr-3 align-top">
                        <Link to={`/admin/workflows/${row.flowId}`} className="font-semibold text-[var(--text)] hover:text-[var(--brand)]">
                          {row.flowName}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">{row.v}</span>
                      </td>
                      <td className="py-2.5 pr-3 align-top text-[var(--text-secondary)]">{row.at}</td>
                      <td className="py-2.5 pr-3 align-top text-[var(--text-secondary)]">{row.operator}</td>
                      <td className="py-2.5 pr-3 align-top text-[var(--text-secondary)]">{row.note}</td>
                      <td className="py-2.5 align-top">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />{badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}