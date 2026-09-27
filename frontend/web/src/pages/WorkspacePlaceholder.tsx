import { ArrowRight, CheckCircle2, Clock3, Plus, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageCopy: Record<string, { title: string; description: string; actions: string[] }> = {
  '/home': { title: '首页', description: '从今天要完成的工作开始，让智能体帮你更快得到结果。', actions: ['新建对话', '运行智能体', '发起流程', '搜索知识'] },
  '/agents': { title: '智能体广场', description: '发现团队已经准备好的智能体，也可以创建自己的工作助手。', actions: ['浏览场景', '查看团队智能体', '创建智能体'] },
  '/copilot': { title: '我的对话', description: '发起一项工作，查看执行进度，并在需要时完成确认。', actions: ['新建对话', '查看历史会话', '查看产出物'] },
  '/tasks': { title: '任务记录', description: '集中查看待处理、进行中、已完成和异常的执行任务。', actions: ['待我处理', '我发起的', '失败与异常'] },
  '/knowledge': { title: '我的知识', description: '基于企业资料提问，查看答案来源和引用位置。', actions: ['开始问答', '上传资料', '查看我的知识库'] },
  '/automations': { title: '我的流程', description: '把重复工作配置成可追踪、可复用的流程。', actions: ['我的流程', '新建流程', '执行记录'] },
  '/team': { title: '我的协作', description: '共享智能体、知识和执行结果，让团队减少重复配置。', actions: ['协作空间', '共享智能体', '协作产出物'] },
  '/insights': { title: '效果看板', description: '查看智能体任务完成情况和预计节省时长。', actions: ['我的使用小结', '任务完成率', '满意度与反馈'] },
  '/account': { title: '个人中心', description: '管理个人资料、账号安全、通知和使用偏好。', actions: ['个人资料', '账号安全', '偏好设置'] },
  '/help': { title: '帮助', description: '了解如何选择智能体、管理知识和跟进任务。', actions: ['快速开始', '常见问题', '联系支持'] },
  '/admin/overview': { title: '运营概览', description: '查看平台健康、异常事项和下一步建议动作。', actions: ['查看运营概览', '处理待办事项', '查看平台健康'] },
  '/admin/agents': { title: '智能体与应用', description: '创建、评测和发布企业智能体与应用。', actions: ['智能体目录', '草稿与待发布', '版本与发布'] },
  '/admin/knowledge': { title: '知识库建设', description: '管理企业知识库、文档资产、数据来源、加工状态和访问权限。', actions: ['知识库', '文档资产', '数据来源', '加工任务', '检索评测'] },
  '/admin/workflows': { title: '自动化流程', description: '设计、发布和分析企业自动化流程。', actions: ['流程目录', '草稿流程', '版本与发布'] },
  '/admin/tools': { title: '插件与工具', description: '管理外部系统和执行工具接入。', actions: ['工具目录', '新增接入', '访问权限'] },
  '/admin/models': { title: '模型与算力', description: '配置模型服务、算力资源和运行策略。', actions: ['模型服务', '运行策略', '健康状态'] },
  '/admin/quotas': { title: '额度与成本', description: '管理企业用量、预算和成本策略。', actions: ['用量概览', '预算策略', '成本明细'] },
  '/admin/roles': { title: '角色与权限', description: '配置角色、权限和成员访问范围。', actions: ['角色列表', '权限策略', '访问范围'] },
  '/admin/operations': { title: '运行监控', description: '查看已发布能力和平台运行状态。', actions: ['运行摘要', '任务队列', '异常记录'] },
  '/admin/alerts': { title: '告警配置', description: '配置异常通知和平台告警策略。', actions: ['告警规则', '通知渠道', '告警记录'] },
  '/admin/security': { title: '安全与合规', description: '管理内容安全、数据安全和合规策略。', actions: ['安全策略', '风险评估', '合规检查'] },
  '/admin/audit': { title: '审计日志', description: '追踪成员和平台操作记录，支持审计导出。', actions: ['操作日志', '访问记录', '导出审计'] },
  '/admin/members': { title: '成员与团队', description: '管理工作空间成员、团队和访问范围。', actions: ['成员管理', '团队管理', '邀请成员'] },
  '/admin/settings': { title: '系统设置', description: '配置品牌界面、通知渠道和开放平台。', actions: ['品牌与界面', '通知渠道', '开放平台'] },
  '/admin/support': { title: '公告与支持', description: '发布平台公告并处理运营支持请求。', actions: ['公告管理', '支持工单', '服务状态'] },
};

export default function WorkspacePlaceholder() {
  const { pathname } = useLocation();
  const copy = pageCopy[Object.keys(pageCopy).find((key) => pathname === key || pathname.startsWith(`${key}/`)) ?? '/home'];
  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border)] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div><h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{copy.description}</p></div>
            <div className="hidden rounded-xl bg-[var(--brand-light)] p-3 text-[var(--brand)] sm:block"><Sparkles className="h-5 w-5" /></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{copy.actions.map((action) => <button key={action} type="button" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"><Plus className="h-4 w-4" />{action}</button>)}</div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          {[['待我处理', '暂时没有新的事项', Clock3], ['最近使用', '登录后将显示你的工作记录', CheckCircle2], ['下一步', '选择上方操作开始使用', ArrowRight]].map(([label, text, Icon]) => <div key={label as string} className="rounded-xl border border-dashed border-[var(--border)] p-5"><Icon className="h-5 w-5 text-[var(--brand)]" /><h3 className="mt-4 text-sm font-semibold">{label as string}</h3><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text as string}</p></div>)}
        </div>
      </section>
    </div>
  );
}
