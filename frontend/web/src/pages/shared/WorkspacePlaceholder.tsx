import { ArrowRight, CheckCircle2, Clock3, Plus, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageCopy: Record<string, { title: string; description: string; actions: string[] }> = {
  '/home': { title: '首页', description: '从今天要完成的工作开始，让智能体帮你更快得到结果。', actions: ['新建对话', '运行智能体', '发起工作流', '搜索知识'] },
  '/agents': { title: '智能体库', description: '查看管理员已开放的智能体，按需选用并进入对话。', actions: ['浏览可用智能体', '查看团队智能体', '开始对话'] },
  '/copilot': { title: '我的对话', description: '发起一项工作，查看执行进度，并在需要时完成确认。', actions: ['新建对话', '查看历史会话', '查看产出物'] },
  '/tasks': { title: '任务记录', description: '集中查看待处理、进行中、已完成和异常的执行任务。', actions: ['待我处理', '我发起的', '失败与异常'] },
  '/knowledge': { title: '我的知识', description: '基于企业资料提问，查看答案来源和引用位置。', actions: ['开始问答', '上传资料', '查看我的知识库'] },
  '/automations': { title: '我的工作流', description: '把重复工作配置成可追踪、可复用的工作流。', actions: ['我的工作流', '新建工作流', '执行记录'] },
  '/team': { title: '我的协作', description: '共享智能体、知识和执行结果，让团队减少重复配置。', actions: ['协作空间', '共享智能体', '协作产出物'] },
  '/insights': { title: '效果看板', description: '查看智能体任务完成情况和预计节省时长。', actions: ['我的使用小结', '任务完成率', '满意度与反馈'] },
  '/account': { title: '个人中心', description: '管理个人资料、账号安全、通知和使用偏好。', actions: ['个人资料', '账号安全', '偏好设置'] },
  '/admin/overview': { title: '运营概览', description: '查看平台健康、异常事项和下一步建议动作。', actions: ['查看运营概览', '处理待办事项', '查看平台健康'] },
  '/admin/agents': { title: '智能体管理', description: '创建、评测和发布企业智能体与应用。', actions: ['智能体目录', '草稿与待发布', '版本与发布'] },
  '/admin/knowledge': { title: '知识管理', description: '管理企业知识库、文档资产、数据来源、加工状态和访问权限。', actions: ['知识库', '文档资产', '数据来源', '加工任务', '检索评测'] },
  '/admin/memory': { title: '记忆管理', description: '管理智能体记忆、用户偏好与跨会话上下文，配置保留策略与可见范围。', actions: ['记忆条目', '保留策略', '可见范围', '评测与导出'] },
  '/admin/workflows': { title: '工作流管理', description: '设计、发布和分析企业工作流。', actions: ['工作流目录', '草稿工作流', '版本与发布'] },
  '/admin/tools': { title: '技能管理', description: '管理企业 Skill、Tool 与 MCP 等可被智能体调用的技能能力。', actions: ['技能目录', '新增接入', '访问权限'] },
  '/admin/evaluations': { title: '评测中心', description: '评测智能体、知识与工作流的质量，对比版本差异并跟踪回归。', actions: ['评测集', '运行评测', '结果对比', '回归追踪'] },
  '/admin/regressions': { title: '回归追踪', description: '智能体 / 知识 / 模型版本变更后自动跑回归用例，发现质量退化。', actions: ['回归用例', '运行结果', '历史对比'] },
  '/admin/feedback': { title: '用户反馈', description: '收集用户对智能体回答的赞踩、修正建议和 badcase。', actions: ['反馈列表', '修正建议', '反馈转用例'] },
  '/admin/models': { title: '模型配置', description: '配置模型服务、算力资源和运行策略。', actions: ['模型服务', '运行策略', '健康状态'] },
  '/admin/quotas': { title: '额度管理', description: '管理企业用量、预算和成本策略。', actions: ['用量概览', '预算策略', '成本明细'] },
  '/admin/operations': { title: '调用链路', description: '会话追溯：还原智能体 / 工具 / MCP 的完整调用链与上下文。', actions: ['实时链路', '慢调用分析', '错误追踪', '调用检索'] },
  '/admin/settings': { title: '平台设置', description: '配置品牌与界面、合规策略、审计日志与成员管理。模型、渠道配置与额度请在「平台治理」侧栏处理。', actions: ['品牌与界面', '合规策略', '审计日志', '成员管理'] },
  '/admin/notifications': { title: '渠道配置', description: '对接飞书、企业微信、钉钉与 Web，让用户在熟悉的入口与智能体对话。', actions: ['飞书', '企业微信', '钉钉', 'Web'] },
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
