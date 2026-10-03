import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyFilterState({
  title = '没有匹配的结果',
  description = '尝试更换关键词或清除筛选条件。',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
