import { describe, expect, it } from 'vitest';
import {
  ROLE_NAV,
  defaultKnowledgeTab,
  defaultSkillsTab,
  defaultWorkflowTab,
  getRoleNavGroups,
  navLabelKeyForPath,
  rolePageCopy,
  visibleKnowledgeTabs,
  visibleSkillsTabs,
  visibleWorkflowTabs,
  workspaceErrorMessage,
} from './role-nav';

function zhLen(key: string, dict: Record<string, string>) {
  return [...(dict[key] ?? '')].length;
}

describe('role-nav IA', () => {
  it('exposes distinct sidebars for user, admin, and auditor', () => {
    expect(getRoleNavGroups('user').flatMap((g) => g.items.map((i) => i.to))).toEqual([
      '/home', '/tasks', '/copilot', '/skills', '/workflows', '/skills', '/knowledge',
    ]);
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/memory');
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/models');
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/channels');
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/audit-center');
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/governance');
    expect(getRoleNavGroups('admin').flatMap((g) => g.items.map((i) => i.to))).toContain('/workspaces');
    expect(getRoleNavGroups('auditor').flatMap((g) => g.items.map((i) => i.to))).toEqual([
      '/home', '/audit-center', '/zero-trust', '/tasks', '/copilot', '/partners', '/workflows', '/knowledge', '/skills', '/memory', '/models',
    ]);
    expect(getRoleNavGroups('user').flatMap((g) => g.items.map((i) => i.to))).not.toContain('/memory');
    expect(getRoleNavGroups('user').flatMap((g) => g.items.map((i) => i.to))).not.toContain('/models');
    expect(getRoleNavGroups('user').flatMap((g) => g.items.map((i) => i.to))).not.toContain('/partners');
  });

  it('keeps Chinese nav labels in compact 2–5 char range for sidebar density', () => {
    const zh: Record<string, string> = {
      'nav.home': '运营总览',
      'nav.copilot': '对话',
      'nav.tasks': '任务中心',
      'nav.tasks.user': '我的待办',
      'nav.tasks.auditor': '任务核查',
      'nav.agents': '智能体工厂',
      'nav.agents.auditor': '伙伴档案',
      'nav.workflows': '工作流程',
      'nav.workflows.auditor': '流程版本',
      'nav.knowledge': '知识中心',
      'nav.knowledge.user': '知识检索',
      'nav.knowledge.auditor': '知识引用',
      'nav.skills': '技能中心',
      'nav.skills.market': '技能·工具·MCP',
      'nav.skills.mine': '我的技能',
      'nav.skills.user': '技能清单',
      'nav.skills.auditor': '技能权限',
      'nav.memory': '记忆中心',
      'nav.memory.auditor': '记忆策略',
      'nav.models': '模型服务',
      'nav.models.auditor': '模型审计',
      'nav.channels': '消息渠道',
      'nav.accessControl': '访问控制',
      'nav.zeroTrust': '持续验证',
      'nav.auditCenter': '审计中心',
      'nav.copilot.auditor': '协作记录',
      'workspace.manage': '工作空间',
      'nav.settingsGeneral': '通用设置',
    };
    for (const role of ['user', 'admin', 'auditor'] as const) {
      for (const item of ROLE_NAV[role].flatMap((g) => g.items)) {
        // 紧凑侧栏标签:2-5 个汉字(中文)以保持视觉密度
        // 例外:nav.skills.market 因含 "·" 分隔与 MCP 缩写,允许 ≤ 12 字
        const len = zhLen(item.i18n, zh);
        if (item.i18n === 'nav.skills.market') {
          expect(len, item.i18n).toBeLessThanOrEqual(12);
          continue;
        }
        expect(len, item.i18n).toBeGreaterThanOrEqual(2);
        expect(len, item.i18n).toBeLessThanOrEqual(5);
      }
    }
  });

  it('resolves breadcrumb keys and page copy by role', () => {
    expect(navLabelKeyForPath('/tasks', 'user')).toBe('nav.tasks.user');
    expect(navLabelKeyForPath('/tasks', 'auditor')).toBe('nav.tasks.auditor');
    expect(rolePageCopy('tasks', 'user').title).toBe('我的待办');
    expect(rolePageCopy('tasks', 'auditor').title).toBe('任务核查');
    expect(rolePageCopy('agents', 'auditor').title).toBe('伙伴档案');
    expect(rolePageCopy('agents', 'admin').title).toBe('智能体工厂');
    expect(rolePageCopy('workflows', 'auditor').title).toBe('流程版本');
    expect(rolePageCopy('copilot', 'auditor').title).toBe('协作记录');
    expect(rolePageCopy('models', 'auditor').title).toBe('模型审计');
    expect(rolePageCopy('models', 'admin').title).toBe('模型服务');
  });

  it('defaults capability tabs for consumption vs audit', () => {
    expect(defaultKnowledgeTab('user')).toBe('retrieval');
    expect(defaultKnowledgeTab('auditor')).toBe('governance');
    expect(visibleKnowledgeTabs('user')).toEqual(['retrieval', 'assets']);
    expect(defaultSkillsTab('auditor')).toBe('governance');
    expect(visibleSkillsTabs('user')).toEqual(['workspace', 'workflowSkills']);
    expect(defaultWorkflowTab('auditor')).toBe('versions');
    expect(visibleWorkflowTabs('auditor')).toEqual(['versions', 'history', 'templates']);
  });

  it('rewrites cross-workspace permission errors', () => {
    expect(workspaceErrorMessage('E_FORBIDDEN: 无权访问其他工作区资源')).toContain('当前工作区无权限');
  });
});
