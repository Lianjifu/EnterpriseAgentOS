/**
 * 管理侧「新建技能」— 路由 /admin/tools/new
 *
 * 顶栏面包屑为「技能管理 > 新建页」。
 */
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Skill, SkillType } from './schema';
import { useCreateSkill } from './useAdminSkills';
import { CreateSkillWizard } from './components/CreateSkillWizard';

function isSkillType(value: string | null): value is SkillType {
  return value === 'Skill' || value === 'Tool' || value === 'MCP';
}

export default function SkillCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const typeParam = params.get('type');
  const locked = isSkillType(typeParam);
  const type: SkillType = locked ? typeParam : 'Skill';
  const create = useCreateSkill();

  const handleCreate = (skill: Skill) => {
    create.mutate({
      id: skill.id,
      name: skill.name,
      type: skill.type,
      description: skill.description,
      owner: skill.owner,
      risk: skill.risk,
      needConfirm: skill.needConfirm,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
    });
    navigate('/admin/tools', { state: { created: skill } });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <CreateSkillWizard
        open
        embedded
        type={type}
        lockType={locked}
        onClose={() => navigate('/admin/tools')}
        onCreate={handleCreate}
      />
    </div>
  );
}
