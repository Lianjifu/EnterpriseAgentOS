import { Download, Upload } from 'lucide-react';

interface ExchangePanelProps {
  onImport: () => void;
  onExport: () => void;
}

export function ExchangePanel({ onImport, onExport }: ExchangePanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">IMPORT / EXPORT</p>
      <h3 className="mt-2 text-lg font-semibold">导入与导出</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">通过 JSON / YAML 在环境间同步技能定义;导入时会自动跳过重名条目。</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">导入技能</p>
              <p className="text-[11px] text-[var(--text-muted)]">支持 .json / .yaml · 解析后逐条确认</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">从其它环境拉一份技能清单,可批量导入并自动以「草稿」状态落地。</p>
          <button type="button" onClick={onImport} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Upload className="h-3.5 w-3.5" />开始导入
          </button>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <Download className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">导出技能</p>
              <p className="text-[11px] text-[var(--text-muted)]">JSON / YAML · 选择范围与字段</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">把当前技能导出为结构化文件,可在测试环境或备份中使用。</p>
          <button type="button" onClick={onExport} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-white">
            <Download className="h-3.5 w-3.5" />开始导出
          </button>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-5 text-xs leading-6 text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text-secondary)]">字段说明</p>
        <ul className="mt-2 space-y-1">
          <li>· <span className="font-mono">meta</span> — 名称、描述、负责人、标签、可见范围</li>
          <li>· <span className="font-mono">schema</span> — 输入输出参数定义(name / type / required / description)</li>
          <li>· <span className="font-mono">permission</span> — 风险等级、需要二次确认</li>
          <li>· <span className="font-mono">version</span> — 当前版本号与历史版本列表</li>
        </ul>
      </div>
    </section>
  );
}