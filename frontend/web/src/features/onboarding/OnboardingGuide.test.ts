import { describe, expect, it } from 'vitest';
import { JOURNEY_CARDS, PREVIEW_NAV_BY_ROLE, PREVIEW_NAV_GROUPS, VALUE_CARDS } from './OnboardingGuide';

describe('OnboardingGuide copy', () => {
  it('admin preview nav mirrors enterprise agent OS sidebar IA', () => {
    const flat = PREVIEW_NAV_GROUPS.flatMap((group) => [...group.items]);
    expect(flat).toEqual([
      '运营总览',
      '智能体',
      '协作会话',
      '模型服务',
      '知识中心',
      '技能中心',
      '记忆中心',
      '审计中心',
      '持续验证',
    ]);
    expect(PREVIEW_NAV_GROUPS.map((g) => g.label)).toEqual([null, '智能体', '能力', '治理']);
  });

  it('exposes role-specific four-character nav previews', () => {
    expect(PREVIEW_NAV_BY_ROLE.user.flatMap((g) => [...g.items])).toEqual([
      '运营总览', '协作会话', '我的待办', '知识检索', '技能清单',
    ]);
    expect(PREVIEW_NAV_BY_ROLE.auditor.flatMap((g) => [...g.items])).toContain('审计中心');
    expect(PREVIEW_NAV_BY_ROLE.auditor.flatMap((g) => [...g.items])).toContain('任务核查');
    expect(PREVIEW_NAV_BY_ROLE.auditor.flatMap((g) => [...g.items])).toContain('智能体档案');
    for (const role of ['user', 'admin', 'auditor'] as const) {
      for (const item of PREVIEW_NAV_BY_ROLE[role].flatMap((g) => g.items)) {
        // 紧凑侧栏标签:2-5 个汉字(中文)以保持视觉密度
        expect([...item].length).toBeGreaterThanOrEqual(2);
        expect([...item].length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('value cards cover governance, capability base, and audit trail', () => {
    expect(VALUE_CARDS.map((c) => c.title)).toEqual([
      '受控边界内协同',
      '智能体能力统一接入',
      '全过程证据关联',
    ]);
    expect(VALUE_CARDS.map((c) => c.eyebrow)).toEqual(['治理优先', '能力底座', '可审计']);
    expect(VALUE_CARDS.some((c) => /记忆|消息渠道/.test(c.description))).toBe(true);
    expect(VALUE_CARDS.some((c) => /持续验证|审批/.test(c.description))).toBe(true);
  });

  it('journey cards follow 接入 → 编排 → 治理', () => {
    expect(JOURNEY_CARDS.map((c) => c.title)).toEqual([
      '接入能力底座',
      '编排智能体与工作流',
      '受控上岗与持续治理',
    ]);
    expect(JOURNEY_CARDS[0].description).toMatch(/记忆|技能/);
    expect(JOURNEY_CARDS[1].description).toMatch(/智能体|工作流/);
    expect(JOURNEY_CARDS[2].description).toMatch(/持续验证|审计/);
  });
});