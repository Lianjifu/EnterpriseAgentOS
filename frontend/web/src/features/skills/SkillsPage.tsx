import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useAdminSkills, useUpdateSkill, useDeleteSkill, useBulkPublish,
} from './useAdminSkills';
import type {
  AdminSkillFilters, Skill, SkillExportField, SkillExportFormat, SkillType,
} from './schema';
import { BatchToolbar } from './components/BatchToolbar';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ImportSkillModal, ExportSkillModal } from './components/ImportExportModals';
import { OverviewPanel } from './components/OverviewPanel';
import { getLifecycleCounts } from './components/constants';
import {
  buildSkillFromDraft, triggerDownload,
  type ImportRow,
} from './components/skill-io';
import { DEFAULT_EXCHANGE_FIELDS } from './components/constants';

const EMPTY_FILTERS: AdminSkillFilters = { type: 'all', status: 'all', q: '', sort: 'updated' };

export default function SkillsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<AdminSkillFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ioType, setIoType] = useState<SkillType>('Skill');
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [notice, setNotice] = useState('');
  // 演示模式下,hook 返回 mock 数据;真实模式下需要本地缓存支持乐观更新。
  // 这里用本地副本作为 source of truth,与 hook 同步。
  const [localSkills, setLocalSkills] = useState<Skill[] | null>(null);

  const { data: remoteSkills = [], isLoading } = useAdminSkills(filters);
  const skills = localSkills ?? remoteSkills;
  const update = useUpdateSkill();
  const created = (location.state as { created?: Skill } | null)?.created;

  useEffect(() => {
    if (!created || isLoading) return;
    setLocalSkills((current) => {
      const base = current ?? remoteSkills;
      if (base.some((item) => item.id === created.id)) return current ?? base;
      return [created, ...base];
    });
    setNotice(`已新增技能「${created.name}」,状态为草稿。`);
    navigate('/admin/tools', { replace: true, state: null });
  }, [created, isLoading, navigate, remoteSkills]);
  const del = useDeleteSkill();
  const bulk = useBulkPublish();

  const visible = useMemo(() => {
    const q = (filters.q ?? '').trim().toLowerCase();
    const list = skills.filter((s) =>
      (filters.type === 'all' || filters.type === undefined || s.type === filters.type) &&
      (filters.status === 'all' || filters.status === undefined || s.status === filters.status) &&
      (q.length === 0 || `${s.name} ${s.description} ${s.owner} ${s.tags.join(' ')}`.toLowerCase().includes(q)),
    );
    const sorted = [...list].sort((a, b) => {
      if (filters.sort === 'calls') return b.calls - a.calls;
      if (filters.sort === 'name') return a.name.localeCompare(b.name, 'zh');
      return 0;
    });
    return sorted;
  }, [skills, filters]);

  const counts = useMemo(() => getLifecycleCounts(skills), [skills]);

  const scopedType: SkillType | null = filters.type && filters.type !== 'all' ? filters.type : null;
  const createLabel = scopedType === 'Tool' ? '新建 Tool' : scopedType === 'MCP' ? '新建 MCP' : '新建技能';

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };
  const openSkill = (skill: Skill) => {
    navigate(`/admin/tools/${skill.id}`);
  };
  const openEdit = (skill: Skill) => {
    navigate(`/admin/tools/${skill.id}?edit=1`);
  };

  const toggleStar = (id: string) => {
    setLocalSkills((current) => current
      ? current.map((s) => s.id === id ? { ...s, starred: !s.starred } : s)
      : current,
    );
  };

  const handlePublish = (skill: Skill) => {
    if (skill.status === 'published') return;
    const next = { ...skill, status: 'published' as const, lastUpdate: '刚刚' };
    setLocalSkills((current) => (current ?? skills).map((item) => item.id === skill.id ? next : item));
    update.mutate({ id: skill.id, patch: { status: 'published' } });
    setNotice(`已发布「${skill.name}」。`);
  };

  const handleDelete = (skill: Skill) => {
    setLocalSkills((current) => current ? current.filter((s) => s.id !== skill.id) : skills.filter((s) => s.id !== skill.id));
    del.mutate({ id: skill.id });
    setNotice(`已删除「${skill.name}」。`);
    setDeleteTarget(null);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const removedIds = [...selectedIds];
    setLocalSkills((current) => current ? current.filter((s) => !removedIds.includes(s.id)) : skills.filter((s) => !removedIds.includes(s.id)));
    setNotice(`已批量删除 ${removedIds.length} 个技能。`);
    setSelectedIds([]);
  };
  const handleBatchPublish = () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setLocalSkills((current) => current
      ? current.map((s) => ids.includes(s.id) ? { ...s, status: 'published', lastUpdate: '刚刚' } : s)
      : skills.map((s) => ids.includes(s.id) ? { ...s, status: 'published', lastUpdate: '刚刚' } : s),
    );
    bulk.mutate({ ids, action: 'publish' });
    setNotice(`已批量发布 ${ids.length} 个技能。`);
    setSelectedIds([]);
  };
  const handleBatchExport = () => setExportOpen(true);

  const openCreate = () => {
    navigate(scopedType ? `/admin/tools/new?type=${scopedType}` : '/admin/tools/new');
  };

  const openImport = () => {
    setIoType(scopedType ?? 'Skill');
    setImportOpen(true);
  };
  const handleImport = (rows: ImportRow[]) => {
    const okRows = rows.filter((r) => r.status === 'ok');
    const newSkills: Skill[] = okRows.map((row) => buildSkillFromDraft(row.name, ioType, '', '张敏', 'low'));
    setLocalSkills((current) => (current ? [...newSkills, ...current] : [...newSkills, ...skills]));
    setNotice(`已导入 ${okRows.length} 个 ${ioType}(其余已跳过)。`);
  };

  const handleExportOne = (skill: Skill) => {
    triggerDownload([skill], 'json', DEFAULT_EXCHANGE_FIELDS, `skill-${skill.name}`);
    setNotice(`已导出「${skill.name}」。`);
  };

  const handleExport = (format: SkillExportFormat, fields: Record<SkillExportField, boolean>) => {
    const pool = scopedType ? skills.filter((s) => s.type === scopedType) : skills;
    const picked = selectedIds.length > 0 ? pool.filter((s) => selectedIds.includes(s.id)) : pool;
    const list = picked.length > 0 ? picked : pool;
    const label = scopedType ?? '全部';
    triggerDownload(list, format, fields, `${(scopedType ?? 'all').toLowerCase()}-skills-export`);
    setNotice(`已导出 ${list.length} 个 ${label} 为 ${format.toUpperCase()} 文件。`);
  };

  return (
    <div className="skills-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">ADMIN / 技能管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把所有技能统一管起来,让用户安心选用。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              管理员统一维护企业级技能能力,涵盖输入输出、风险等级、可见范围与版本;用户侧只读使用,不修改配置。
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <Boxes className="h-3 w-3" />{skills.length} 个技能 · 已发布 {counts.published}
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="violet" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      {selectedIds.length > 0 && (
        <BatchToolbar
          count={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onBatchPublish={handleBatchPublish}
          onBatchDelete={handleBatchDelete}
          onBatchExport={handleBatchExport}
        />
      )}
      <OverviewPanel
        visible={visible}
        filters={filters}
        onFiltersChange={setFilters}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleStar={toggleStar}
        onSelect={openSkill}
        onEdit={openEdit}
        onPublish={handlePublish}
        onExportOne={handleExportOne}
        onRequestDelete={setDeleteTarget}
        createLabel={createLabel}
        onCreate={openCreate}
        onImport={openImport}
      />
      {isLoading && !skills.length && <p className="text-xs text-[var(--text-muted)]">加载中…</p>}

      <ImportSkillModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        existing={skills}
      />

      <ExportSkillModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={(scopedType ? skills.filter((s) => s.type === scopedType) : skills).length}
        selectedCount={(scopedType ? skills.filter((s) => s.type === scopedType) : skills).filter((s) => selectedIds.includes(s.id)).length}
      />

      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        skill={deleteTarget}
      />
    </div>
  );
}