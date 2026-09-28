/**
 * 用户侧「我的协作」fixtures — 与原 MyTeam.tsx 内联数据对应。
 */
import type { Team, Member, SharedItem } from '@/api/user/team/schema';

export const mockTeams: Team[] = [
  { name: '产品协作组', note: '让产品知识、反馈与发布保持同步', accent: 'emerald' },
  { name: '客户成功组', note: '围绕客户问题快速共享答案', accent: 'sky' },
  { name: '运营支持组', note: '把经验沉淀成可复用的做法', accent: 'amber' },
];

export const mockMembers: Member[] = [
  { id: 'm1', name: '林予', role: '产品负责人', team: '产品协作组', initials: '林', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { id: 'm2', name: '陈可', role: '体验设计', team: '产品协作组', initials: '陈', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
  { id: 'm3', name: '赵明', role: '客户成功', team: '客户成功组', initials: '赵', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  { id: 'm4', name: '吴安', role: '运营协调', team: '运营支持组', initials: '吴', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
];

export const mockSharedItems: SharedItem[] = [
  { id: 'a1', title: '客户沟通助手', kind: 'agent', team: '客户成功组', owner: '赵明', description: '整理客户来信,帮助团队快速形成有依据的回复草稿。', updated: '今天共享', label: '服务响应' },
  { id: 'a2', title: '需求梳理伙伴', kind: 'agent', team: '产品协作组', owner: '林予', description: '把访谈记录归纳为主题,保留原话与后续行动建议。', updated: '本周共享', label: '需求洞察' },
  { id: 'k1', title: '产品发布资料集', kind: 'knowledge', team: '产品协作组', owner: '林予', description: '发布说明、常见问题与支持口径的统一参考。', updated: '昨天更新', label: '产品资料' },
  { id: 'k2', title: '服务沟通规范', kind: 'knowledge', team: '客户成功组', owner: '赵明', description: '覆盖客户服务场景的沟通原则与典型案例。', updated: '本周更新', label: '服务规范' },
  { id: 'o1', title: '九月用户反馈纪要', kind: 'output', team: '产品协作组', owner: '陈可', description: '跨团队讨论后的主题结论、引用和待确认问题。', updated: '今天产出', label: '会议纪要' },
  { id: 'o2', title: '服务问题趋势摘要', kind: 'output', team: '客户成功组', owner: '赵明', description: '近期高频问题与团队处理方式的简要整理。', updated: '昨天产出', label: '工作摘要' },
  { id: 'o3', title: '月度协作复盘', kind: 'output', team: '运营支持组', owner: '吴安', description: '跨团队协作中的有效做法和下一轮优化建议。', updated: '本周产出', label: '复盘记录' },
];