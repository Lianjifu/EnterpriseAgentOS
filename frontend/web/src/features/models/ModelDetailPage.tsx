/**
 * Admin 模型详情 — 独立页面 /admin/models/:id
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import type { Model } from './schema';
import { useModelsList, useRouteRules, useUpdateModel } from './useModels';
import {
  DrawerPanelAudit,
  DrawerPanelDetail,
  DrawerPanelParams,
  DrawerPanelRoute,
  DrawerSidebar,
  type ModelDrawerPanel,
} from './components/DrawerPanels';
import { STATUS_BADGE, TIER_LABEL } from './components/constants';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <Link to="/admin/models" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回模型配置
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">模型不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

export default function ModelDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const modelsQuery = useModelsList({});
  const routesQuery = useRouteRules();
  const updateModel = useUpdateModel();

  const models = modelsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const original = useMemo(() => models.find((m) => m.id === id), [models, id]);

  const [draft, setDraft] = useState<Model | null>(null);
  const [panel, setPanel] = useState<ModelDrawerPanel>('detail');

  useEffect(() => {
    setDraft(original ?? null);
    setPanel('detail');
  }, [original?.id]);

  if (!original || !draft) return <NotFound />;

  const badge = STATUS_BADGE[draft.status];
  const update = (patch: Partial<Model>) => setDraft({ ...draft, ...patch });

  const handleSave = () => {
    const { id: modelId, ...patch } = draft;
    updateModel.mutate({ id: modelId, patch }, { onSuccess: () => navigate('/admin/models') });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <Link to="/admin/models" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回模型配置
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">模型 · {TIER_LABEL[draft.tier]}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{draft.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{draft.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
              {badge.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{draft.providerName}</span>
          </div>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Bot className="h-5 w-5" />
        </span>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <DrawerSidebar panel={panel} setPanel={setPanel} />
          <div className="flex-1 space-y-5">
            {panel === 'detail' && <DrawerPanelDetail model={draft} onChange={update} />}
            {panel === 'params' && <DrawerPanelParams model={draft} />}
            {panel === 'route' && <DrawerPanelRoute routes={routes} modelId={draft.id} />}
            {panel === 'audit' && <DrawerPanelAudit model={draft} />}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <Link to="/admin/models" className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">关闭</Link>
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Save className="h-3.5 w-3.5" />保存修改
          </button>
        </div>
      </section>
    </div>
  );
}
