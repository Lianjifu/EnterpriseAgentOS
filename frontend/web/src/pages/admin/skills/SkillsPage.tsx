import { useMemo, useState } from 'react';
import { Boxes, Plus, Upload, Download } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useAdminSkills, useCreateSkill, useUpdateSkill, useDeleteSkill, useBulkPublish,
} from '@/api/admin/skills';
import type {
  AdminSkillFilters, Skill, SkillExportField, SkillExportFormat, TemplateSeed,
} from '@/api/admin/skills/schema';
import { BatchToolbar } from './components/BatchToolbar';
import { CreateSkillWizard } from './components/CreateSkillWizard';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExchangePanel } from './components/ExchangePanel';
import { ImportSkillModal, ExportSkillModal } from './components/ImportExportModals';
import { OverviewPanel } from './components/OverviewPanel';
import { SkillDetailDrawer } from './components/SkillDetailDrawer';
import { TABS, TabId, getLifecycleCounts } from './components/constants';
import { TemplateTabPanel } from './components/TemplateTabPanel';
import { MCP_TEMPLATES, SKILL_TEMPLATES, TOOL_TEMPLATES } from './components/templates';
import {
  buildSkillFromDraft, buildSkillFromTemplate, triggerDownload, uid,
  type ImportRow,
} from './components/skill-io';
import { DEFAULT_EXCHANGE_FIELDS } from './components/constants';

const EMPTY_FILTERS: AdminSkillFilters = { type: 'all', status: 'all', q: '', sort: 'updated' };

export default function SkillsPage() {
  const [filters, setFilters] = useState<AdminSkillFilters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<TabId>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Skill | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [notice, setNotice] = useState('');
  // 演示模式下,hook 返回 mock 数据;真实模式下需要本地缓存支持乐观更新。
  // 这里用本地副本作为 source of truth,与 hook 同步。
  const [localSkills, setLocalSkills] = useState<Skill[] | null>(null);

  const { data: remoteSkills = [], isLoading } = useAdminSkills(filters);
  const skills = localSkills ?? remoteSkills;
  const create = useCreateSkill();
  const update = useUpdateSkill();
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

  const tabCounts = useMemo(() => ({
    overview: counts.total,
    skill: skills.filter((s) => s.type === 'Skill').length,
    tool: skills.filter((s) => s.type === 'Tool').length,
    mcp: skills.filter((s) => s.type === 'MCP').length,
    exchange: counts.total,
  }), [counts.total, skills]);

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };
  const toggleStar = (id: string) => {
    if (detail && detail.id === id) setDetail({ ...detail, starred: !detail.starred });
    setLocalSkills((current) => current
      ? current.map((s) => s.id === id ? { ...s, starred: !s.starred } : s)
      : current,
    );
  };

  const updateDetail = (patch: Partial<Skill>) => {
    if (!detail) return;
    setDetail({ ...detail, ...patch });
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    setLocalSkills((current) => current
      ? current.map((s) => s.id === detail.id ? { ...detail } : s)
      : current,
    );
    update.mutate({ id: detail.id, patch: {
      name: detail.name,
      description: detail.description,
      owner: detail.owner,
      version: detail.version,
      risk: detail.risk,
      needConfirm: detail.needConfirm,
      visibleScope: detail.visibleScope,
      tags: detail.tags,
      starred: detail.starred,
      inputSchema: detail.inputSchema,
      outputSchema: detail.outputSchema,
    } });
    setNotice(`已保存「${detail.name}」的修改。`);
    setDetail(null);
  };

  const handleDuplicate = (skill: Skill) => {
    const copy: Skill = {
      ...skill, id: uid('skill'), name: `${skill.name} 副本`, status: 'draft', version: 'draft',
      calls: 0, lastUpdate: '刚刚', starred: false,
    };
    setLocalSkills((current) => (current ? [copy, ...current] : [copy, ...skills]));
    setNotice(`已复制为草稿:${copy.name}`);
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
  const handleBatchRetire = () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setLocalSkills((current) => current
      ? current.map((s) => ids.includes(s.id) ? { ...s, status: 'retired', lastUpdate: '刚刚' } : s)
      : skills.map((s) => ids.includes(s.id) ? { ...s, status: 'retired', lastUpdate: '刚刚' } : s),
    );
    bulk.mutate({ ids, action: 'retire' });
    setNotice(`已批量下线 ${ids.length} 个技能。`);
    setSelectedIds([]);
  };
  const handleBatchExport = () => setExportOpen(true);

  const handleCreate = (skill: Skill) => {
    setLocalSkills((current) => (current ? [skill, ...current] : [skill, ...skills]));
    create.mutate({
      name: skill.name,
      type: skill.type,
      description: skill.description,
      owner: skill.owner,
      risk: skill.risk,
      needConfirm: skill.needConfirm,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
    });
    setNotice(`已新增技能「${skill.name}」,状态为草稿。`);
    setCreateOpen(false);
    setTab('overview');
  };

  const handleImport = (rows: ImportRow[]) => {
    const okRows = rows.filter((r) => r.status === 'ok');
    const newSkills: Skill[] = okRows.map((row) => buildSkillFromDraft(row.name, 'Skill', '', '张敏', 'low'));
    setLocalSkills((current) => (current ? [...newSkills, ...current] : [...newSkills, ...skills]));
    setNotice(`已导入 ${okRows.length} 个技能(其余已跳过)。`);
  };

  const handleExportOne = (skill: Skill) => {
    triggerDownload([skill], 'json', DEFAULT_EXCHANGE_FIELDS, `skill-${skill.name}`);
  };

  const handleExport = (format: SkillExportFormat, fields: Record<SkillExportField, boolean>) => {
    const list = selectedIds.length > 0 ? skills.filter((s) => selectedIds.includes(s.id)) : skills;
    triggerDownload(list, format, fields, 'skills-export');
    setNotice(`已导出 ${list.length} 个技能为 ${format.toUpperCase()} 文件。`);
  };

  const handleAddTemplate = (template: TemplateSeed) => {
    const name = `${template.name} · 副本`;
    const skill = buildSkillFromTemplate(template, name, template.owner);
    setLocalSkills((current) => (current ? [skill, ...current] : [skill, ...skills]));
    create.mutate({
      name: skill.name,
      type: skill.type,
      description: skill.description,
      owner: skill.owner,
      risk: skill.risk,
      needConfirm: skill.needConfirm,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
    });
    setNotice(`已从模板加入草稿:${name}`);
    setTab('overview');
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
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Upload className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新增技能
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Boxes className="h-3 w-3" />{skills.length} 个技能 · 已发布 {counts.published}
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="violet" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      <nav aria-label="子模块导航" className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const count = tabCounts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
            >
              {t.label}
              <span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${tab === t.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && (
        <>
          {selectedIds.length > 0 && (
            <BatchToolbar
              count={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onBatchPublish={handleBatchPublish}
              onBatchRetire={handleBatchRetire}
              onBatchDelete={handleBatchDelete}
              onBatchExport={handleBatchExport}
            />
          )}
          <OverviewPanel
            visible={visible}
            filters={filters}
            onFiltersChange={setFilters}
            counts={{ total: counts.total, published: counts.published }}
            selectedIds={selectedIds}
            openMenuId={openMenuId}
            onToggleSelect={toggleSelect}
            onToggleStar={toggleStar}
            onToggleMenu={setOpenMenuId}
            onSelect={setDetail}
            onEdit={setDetail}
            onDuplicate={handleDuplicate}
            onExportOne={handleExportOne}
            onRequestDelete={setDeleteTarget}
          />
          {isLoading && !skills.length && <p className="text-xs text-[var(--text-muted)]">加载中…</p>}
        </>
      )}

      {tab === 'skill' && (
        <TemplateTabPanel
          eyebrow="技能模板"
          title="Skill 技能"
          description="把经验或流程沉淀成可复用的工作技能。点击「加入草稿」即可在总览中看到这条新技能。"
          eyebrowTone="violet"
          templates={SKILL_TEMPLATES}
          onAdd={handleAddTemplate}
        />
      )}

      {tab === 'tool' && (
        <TemplateTabPanel
          eyebrow="技能模板"
          title="Tool 技能"
          description="受控工具通常涉及外部系统,需明确风险等级与确认机制。"
          eyebrowTone="amber"
          templates={TOOL_TEMPLATES}
          onAdd={handleAddTemplate}
        />
      )}

      {tab === 'mcp' && (
        <TemplateTabPanel
          eyebrow="技能模板"
          title="MCP 技能"
          description="通过 MCP 协议接入第三方服务,授权范围和数据流向是必填项。"
          eyebrowTone="sky"
          templates={MCP_TEMPLATES}
          onAdd={handleAddTemplate}
        />
      )}

      {tab === 'exchange' && (
        <ExchangePanel onImport={() => setImportOpen(true)} onExport={() => setExportOpen(true)} />
      )}

      <SkillDetailDrawer
        skill={detail}
        onClose={() => setDetail(null)}
        onChange={updateDetail}
        onSave={handleSaveDetail}
        onExport={() => detail && handleExportOne(detail)}
      />

      <CreateSkillWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

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
        total={skills.length}
        selectedCount={selectedIds.length}
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