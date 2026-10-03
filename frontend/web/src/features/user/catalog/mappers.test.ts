import { describe, expect, it } from 'vitest';
import { mockAgents } from '@/features/agents/fixtures';
import { mockAdminSkills } from '@/features/skills/fixtures';
import { mockFlows } from '@/features/workflows/fixtures';
import { mockKbs, mockDocs } from '@/features/knowledge/fixtures';
import {
  projectOpenAgents,
  projectOpenSkills,
  projectOpenWorkflows,
  projectKnowledgeDocs,
  mapAgentCategory,
} from './mappers';

describe('catalog mappers', () => {
  it('projects published workspace-visible agents and maps categories', () => {
    const agents = projectOpenAgents(mockAgents);
    expect(agents.some((agent) => agent.id === 'a-customer-v3')).toBe(true);
    expect(agents.find((agent) => agent.id === 'a-insight-v2')?.category).toBe('数据分析');
    expect(mapAgentCategory('客服一组')).toBe('客服应答');
    expect(agents.every((agent) => Boolean(agent.example))).toBe(true);
  });

  it('hides draft/retired skills and keeps published ones available with agent links', () => {
    const skills = projectOpenSkills(mockAdminSkills);
    expect(skills.some((skill) => skill.id === 'skill-summary')).toBe(true);
    expect(skills.some((skill) => skill.id === 'skill-draft')).toBe(false);
    expect(skills.find((skill) => skill.id === 'skill-summary')?.status).toBe('available');
    expect(skills.find((skill) => skill.id === 'skill-summary')?.relatedAgents).toContain('客户沟通助手');
  });

  it('only exposes published workflows with step labels', () => {
    const flows = projectOpenWorkflows(mockFlows);
    expect(flows.every((flow) => flow.availability === 'available')).toBe(true);
    expect(flows.some((flow) => flow.id === 'wf-weekly')).toBe(true);
    expect(flows.some((flow) => flow.id === 'wf-onboard')).toBe(false);
    expect(flows.find((flow) => flow.id === 'wf-weekly')?.steps.length).toBeGreaterThan(0);
  });

  it('projects parsed docs from indexed workspace-visible knowledge bases', () => {
    const resources = projectKnowledgeDocs(mockKbs, mockDocs);
    expect(resources.some((item) => item.id === 'doc-001')).toBe(true);
    expect(resources.some((item) => item.id === 'doc-003')).toBe(false);
    expect(resources.find((item) => item.id === 'doc-001')?.excerpt).toBeTruthy();
  });
});
