/**
 * 管理侧「知识管理」常量 — Tab / 范围 / 数据源类型元 / Wizard 步骤 / 下载工具。
 */
import type { TabId, Range, DocType, SourceType } from '@/api/admin/knowledge/schema';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'kb', label: '知识库' },
  { id: 'docs', label: '文档' },
  { id: 'sources', label: '数据源' },
  { id: 'tasks', label: '任务' },
  { id: 'eval', label: '评测' },
];

export const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: '7 天' },
  { id: '30d', label: '30 天' },
  { id: '90d', label: '90 天' },
];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  manual: '手册',
  policy: '制度',
  meeting: '会议',
  contract: '合同',
  faq: 'FAQ',
};

export const SOURCE_TYPE_META: Record<SourceType, { label: string; icon: string }> = {
  notion: { label: 'Notion', icon: '📝' },
  slack: { label: 'Slack', icon: '💬' },
  web: { label: '网页', icon: '🌐' },
  postgres: { label: 'Postgres', icon: '🛢️' },
  s3: { label: 'S3', icon: '🪣' },
  api: { label: 'API', icon: '🔌' },
  folder: { label: '本地', icon: '📁' },
  confluence: { label: 'Confluence', icon: '🧩' },
};

export const TASK_KIND_LABEL = {
  index: '索引',
  reindex: '增量',
  rebuild: '重建',
} as const;

export const QUALITY_TREND: { label: string; hit: number; mrr: number }[] = [
  { label: '周一', hit: 0.91, mrr: 0.85 },
  { label: '周二', hit: 0.92, mrr: 0.86 },
  { label: '周三', hit: 0.93, mrr: 0.87 },
  { label: '周四', hit: 0.92, mrr: 0.86 },
  { label: '周五', hit: 0.94, mrr: 0.88 },
  { label: '周六', hit: 0.94, mrr: 0.89 },
  { label: '周日', hit: 0.95, mrr: 0.90 },
];

export const WIZARD_STEPS = [
  { id: 'basic', label: '基础信息' },
  { id: 'sources', label: '关联数据源' },
  { id: 'retrieval', label: '检索设置' },
  { id: 'confirm', label: '确认' },
];

export function downloadBlob(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}