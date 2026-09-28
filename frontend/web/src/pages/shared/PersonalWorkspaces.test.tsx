import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import MyKnowledge from '@/pages/user/knowledge';
import MyAutomations from '@/pages/user/automations';
import MyTeam from '@/pages/user/team';
import MySkills from '@/pages/user/skills';
import { mockCapabilities } from '@/mock/user/skills.fixtures';
import { mockKnowledgeResources } from '@/mock/user/knowledge.fixtures';
import { mockFlows, mockFlowRuns } from '@/mock/user/automations.fixtures';
import { mockTeams, mockMembers, mockSharedItems } from '@/mock/user/team.fixtures';
import { qk } from '@/api/shared/query-keys';

function renderWithProviders(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData([...qk.user.skills.list, {}, 'w1'], mockCapabilities);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => cleanup());

describe('我的知识', () => {
  function renderKnowledge() {
    const qc = makeClient();
    qc.setQueryData([...qk.user.knowledge.list, {}, 'w1'], mockKnowledgeResources);
    return render(<MyKnowledge />, { wrapper: wrap(qc) });
  }

  it('filters resources and opens source details', () => {
    renderKnowledge();
    fireEvent.change(screen.getByPlaceholderText('搜索标题、团队或标签'), { target: { value: '报销' } });
    expect(screen.getAllByText('差旅与报销指南').length).toBeGreaterThan(0);
    expect(screen.queryByText('信息安全行为规范')).toBeNull();
    fireEvent.click(screen.getByText('差旅与报销指南'));
    expect(screen.getByRole('dialog', { name: '差旅与报销指南详情' })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: '差旅与报销指南详情' })).getByText('财务团队')).toBeTruthy();
  });

  it('answers locally, keeps question history, and opens a knowledge source', () => {
    renderKnowledge();
    fireEvent.change(screen.getByPlaceholderText('例如：入职第一周要完成什么？'), { target: { value: '入职' } });
    fireEvent.click(screen.getByRole('button', { name: '查看示例' }));
    expect(screen.getByText('示例回答 · 未连接知识服务')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /参考：员工入职与成长手册/ }));
    expect(screen.getByRole('dialog', { name: '员工入职与成长手册详情' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '带入对话' }));
  });

  it('filters by tag, favorites a resource, and copies a citation', () => {
    renderKnowledge();
    fireEvent.change(screen.getByLabelText('按标签筛选'), { target: { value: '安全' } });
    expect(screen.getByText('信息安全行为规范')).toBeTruthy();
    expect(screen.getAllByRole('article').length).toBe(1);
    fireEvent.click(screen.getByText('信息安全行为规范'));
    fireEvent.click(screen.getByRole('button', { name: '复制引用' }));
    expect(screen.getByRole('status').textContent).toContain('引用摘要已复制');
  });
});

describe('我的流程', () => {
  function renderAutomations() {
    const qc = makeClient();
    qc.setQueryData([...qk.user.automations.list, {}, 'w1'], mockFlows);
    qc.setQueryData([...qk.user.automations.runs, 'w1'], mockFlowRuns);
    return render(<MyAutomations />, { wrapper: wrap(qc) });
  }

  it('filters available flows and records a local use', () => {
    renderAutomations();
    fireEvent.change(screen.getByPlaceholderText('搜索流程、场景或团队'), { target: { value: '晨间' } });
    expect(screen.getByRole('button', { name: '晨间信息简报' })).toBeTruthy();
    expect(screen.queryByText('客户反馈分类')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /使用流程/ }));
    expect(screen.getByRole('dialog', { name: '使用晨间信息简报' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('例如：整理本周华东客户进展'), { target: { value: '每日摘要' } });
    fireEvent.click(screen.getByRole('button', { name: '确认使用' }));
    expect(screen.getByRole('status').textContent).toContain('已加入本地使用记录');
  });

  it('opens steps, favorites a flow, and filters unavailable flows', () => {
    renderAutomations();
    fireEvent.click(screen.getAllByRole('button', { name: /查看步骤/ })[0]);
    expect(screen.getByRole('dialog', { name: /流程详情/ })).toBeTruthy();
    expect(screen.getByText('收集工作记录')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /关闭流程详情/ }));
    fireEvent.click(screen.getByRole('button', { name: '取消收藏销售周报自动整理' }));
    expect(screen.getByRole('button', { name: '收藏销售周报自动整理' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '暂不可用' }));
    expect(screen.getByText('客户反馈分类')).toBeTruthy();
    expect((screen.getByRole('button', { name: /使用流程/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('我的技能', () => {
  it('switches capability types, favorites, and opens details', () => {
    renderWithProviders(<MySkills />);
    fireEvent.click(screen.getByRole('tab', { name: 'Tool' }));
    expect(screen.getByText('日历安排工具')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '收藏日历安排工具' }));
    expect(screen.getByRole('button', { name: '取消收藏日历安排工具' })).toBeTruthy();
    fireEvent.click(screen.getByRole('heading', { name: '日历安排工具' }));
    expect(screen.getByRole('dialog', { name: '日历安排工具详情' })).toBeTruthy();
  });

  it('confirms a Skill use and records it locally', () => {
    renderWithProviders(<MySkills />);
    fireEvent.click(screen.getByRole('heading', { name: '资料摘要助手' }));
    fireEvent.click(screen.getByRole('button', { name: '使用能力' }));
    expect(screen.getByRole('dialog', { name: '使用资料摘要助手' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('例如：整理本周客户反馈并提取三个行动项'), { target: { value: '整理本周资料' } });
    fireEvent.click(screen.getByRole('button', { name: '确认使用' }));
    expect(screen.getByRole('status').textContent).toContain('已加入本地使用记录');
  });

  it('filters unavailable capabilities and sends Tool to Copilot', () => {
    renderWithProviders(<MySkills />);
    fireEvent.change(screen.getByLabelText('按状态筛选'), { target: { value: 'unavailable' } });
    fireEvent.click(screen.getByRole('heading', { name: '团队云盘连接' }));
    expect(screen.getByRole('dialog', { name: '团队云盘连接详情' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '使用能力' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('我的协作', () => {
  function renderTeam() {
    const qc = makeClient();
    qc.setQueryData([...qk.user.team.root, 'teams', 'w1'], mockTeams);
    qc.setQueryData([...qk.user.team.members, 'w1'], mockMembers);
    qc.setQueryData([...qk.user.team.shared, 'w1'], mockSharedItems);
    return render(<MyTeam />, { wrapper: wrap(qc) });
  }

  it('switches teams and resource tabs, then favorites a shared item', () => {
    renderTeam();
    fireEvent.click(screen.getByRole('tab', { name: '智能体' }));
    expect(screen.getByText('需求梳理伙伴')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '取消收藏需求梳理伙伴' }));
    expect(screen.getByRole('button', { name: '收藏需求梳理伙伴' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /客户成功组/ }));
    expect(screen.getByText('客户沟通助手')).toBeTruthy();
    expect(screen.queryByText('需求梳理伙伴')).toBeNull();
    fireEvent.click(screen.getByText('客户沟通助手'));
    expect(screen.getByRole('dialog', { name: '客户沟通助手详情' })).toBeTruthy();
  });

  it('adds an invitation only to the local demo list', () => {
    renderTeam();
    fireEvent.click(screen.getByRole('button', { name: '邀请协作者' }));
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'new@company.com' } });
    fireEvent.click(screen.getByRole('button', { name: '加入演示列表' }));
    expect(screen.getByText('new@company.com')).toBeTruthy();
    expect(screen.getByText(/未发送真实邀请/)).toBeTruthy();
  });
});