import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import MyKnowledge from './MyKnowledge';
import MyAutomations from './MyAutomations';
import MyTeam from './MyTeam';
import MySkills from './MySkills';

afterEach(() => cleanup());

describe('我的知识', () => {
  it('filters resources and opens source details', () => {
    render(<MemoryRouter><MyKnowledge /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('搜索标题、团队或标签'), { target: { value: '报销' } });
    expect(screen.getAllByText('差旅与报销指南').length).toBeGreaterThan(0);
    expect(screen.queryByText('信息安全行为规范')).toBeNull();
    fireEvent.click(screen.getByText('差旅与报销指南'));
    expect(screen.getByRole('dialog', { name: '差旅与报销指南详情' })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: '差旅与报销指南详情' })).getByText('财务团队')).toBeTruthy();
  });

  it('answers locally, keeps question history, and opens a knowledge source', () => {
    render(<MemoryRouter><MyKnowledge /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('例如：入职第一周要完成什么？'), { target: { value: '入职' } });
    fireEvent.click(screen.getByRole('button', { name: '查看示例' }));
    expect(screen.getByText('示例回答 · 未连接知识服务')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /参考：员工入职与成长手册/ }));
    expect(screen.getByRole('dialog', { name: '员工入职与成长手册详情' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '带入对话' }));
  });

  it('filters by tag, favorites a resource, and copies a citation', () => {
    render(<MemoryRouter><MyKnowledge /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('按标签筛选'), { target: { value: '安全' } });
    expect(screen.getByText('信息安全行为规范')).toBeTruthy();
    expect(screen.getAllByRole('article').length).toBe(1);
    fireEvent.click(screen.getByText('信息安全行为规范'));
    fireEvent.click(screen.getByRole('button', { name: '复制引用' }));
    expect(screen.getByRole('status').textContent).toContain('引用摘要已复制');
  });
});

describe('我的流程', () => {
  it('filters available flows and records a local use', () => {
    render(<MyAutomations />);
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
    render(<MyAutomations />);
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
    render(<MemoryRouter><MySkills /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'Tool' }));
    expect(screen.getByText('日历安排工具')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '收藏日历安排工具' }));
    expect(screen.getByRole('button', { name: '取消收藏日历安排工具' })).toBeTruthy();
    fireEvent.click(screen.getByRole('heading', { name: '日历安排工具' }));
    expect(screen.getByRole('dialog', { name: '日历安排工具详情' })).toBeTruthy();
  });

  it('confirms a Skill use and records it locally', () => {
    render(<MemoryRouter><MySkills /></MemoryRouter>);
    fireEvent.click(screen.getByRole('heading', { name: '资料摘要助手' }));
    fireEvent.click(screen.getByRole('button', { name: '使用能力' }));
    expect(screen.getByRole('dialog', { name: '使用资料摘要助手' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('例如：整理本周客户反馈并提取三个行动项'), { target: { value: '整理本周资料' } });
    fireEvent.click(screen.getByRole('button', { name: '确认使用' }));
    expect(screen.getByRole('status').textContent).toContain('已加入本地使用记录');
  });

  it('filters unavailable capabilities and sends Tool to Copilot', () => {
    render(<MemoryRouter><MySkills /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('按状态筛选'), { target: { value: '暂不可用' } });
    fireEvent.click(screen.getByRole('heading', { name: '团队云盘连接' }));
    expect(screen.getByRole('dialog', { name: '团队云盘连接详情' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '使用能力' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('我的协作', () => {
  it('switches teams and resource tabs, then favorites a shared item', () => {
    render(<MyTeam />);
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
    render(<MyTeam />);
    fireEvent.click(screen.getByRole('button', { name: '邀请协作者' }));
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'new@company.com' } });
    fireEvent.click(screen.getByRole('button', { name: '加入演示列表' }));
    expect(screen.getByText('new@company.com')).toBeTruthy();
    expect(screen.getByText(/未发送真实邀请/)).toBeTruthy();
  });
});
