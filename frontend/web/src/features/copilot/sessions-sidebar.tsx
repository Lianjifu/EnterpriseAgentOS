/**
 * Copilot 左侧 session 列表 — 拆分自 pages/Copilot.tsx 内联 aside。
 *
 * 封装:
 *  - 会话头部(标题 / 计数 / "新会话" 按钮,只读态显示提示)
 *  - 搜索输入
 *  - 分组列表(置顶 / 今天 / 昨天 / 本周 / 更早),每个 session 显示
 *    标题、unread 或 time、preview、agent + status badge、悬浮 delete
 *  - 空状态
 *
 * 自身无 state,所有搜索/分组由父组件 useMemo 计算后传入。
 */
import { Bot, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '@de/web-utils';
import { Badge, Button } from '@de/web-ui';

interface SessionsSidebarItem {
  id: string;
  conversationId?: string;
  title?: string;
  preview?: string;
  agent?: string;
  status?: string;
  pinned?: boolean;
  unread?: number;
  time?: string;
  group?: 'today' | 'yesterday' | 'week' | 'earlier';
  pendingTurn?: unknown;
  messages?: { status?: string }[];
}

export type SessionsSidebarGroups = {
  pinned: SessionsSidebarItem[];
  today: SessionsSidebarItem[];
  yesterday: SessionsSidebarItem[];
  week: SessionsSidebarItem[];
  earlier: SessionsSidebarItem[];
};

interface SessionsSidebarProps {
  open: boolean;
  canMutate: boolean;
  pageCopy: { title: string; subtitle: string };
  searchQ: string;
  setSearchQ: (v: string) => void;
  filteredCount: number;
  grouped: SessionsSidebarGroups;
  activeId: string | null;
  onNewSession: () => void;
  onSwitch: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (item: SessionsSidebarItem) => void;
}

function SessionsSidebar({
  open,
  canMutate,
  pageCopy,
  searchQ,
  setSearchQ,
  filteredCount,
  grouped,
  activeId,
  onNewSession,
  onSwitch,
  onTogglePin,
  onDelete,
}: SessionsSidebarProps) {
  return (
    <aside
      id="copilot-sessions"
      className="copilot-sessions"
      aria-label="会话列表"
      data-open={open ? 'true' : 'false'}
    >
      <div className="copilot-sessions__head">
        <div className="copilot-sessions__title-row">
          <h2>{pageCopy.title}</h2>
          <span className="copilot-sessions__count" title="当前工作区可见会话数">{filteredCount}</span>
        </div>
        {canMutate ? (
          <Button size="sm" className="copilot-sessions__new" onClick={onNewSession}>
            <Plus className="h-3.5 w-3.5" />新会话
          </Button>
        ) : (
          <p className="px-1 text-[10px] leading-4 text-[var(--text-muted)]">{pageCopy.subtitle}</p>
        )}
        <div className="copilot-sessions__search">
          <Search className="h-3.5 w-3.5" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="搜索会话..."
            aria-label="搜索会话"
          />
        </div>
      </div>

      <div className="copilot-sessions__body">
        {(['pinned', 'today', 'yesterday', 'week', 'earlier'] as const).map((g) =>
          grouped[g].length === 0 ? null : (
            <section key={g} className="copilot-sessions__group">
              <div className="copilot-sessions__group-head">
                {g === 'pinned' && <Pin className="h-3 w-3" />}
                <span>{g === 'today' ? '今天' : g === 'yesterday' ? '昨天' : g === 'week' ? '本周' : g === 'earlier' ? '更早' : '置顶'}</span>
                <span className="copilot-sessions__group-count">{grouped[g].length}</span>
              </div>
              <div className="copilot-sessions__list">
                {grouped[g].map((s) => {
                  const active = s.id === activeId;
                  const sessionGenerating = Boolean(s.pendingTurn)
                    || (s.messages ?? []).some((m) => m.status === 'streaming' || m.status === 'in_flight' || m.status === 'queued');
                  return (
                    <div key={s.id} className="copilot-session-item__wrap group">
                      <button
                        type="button"
                        onClick={() => onSwitch(s.id)}
                        onDoubleClick={() => onTogglePin(s.id)}
                        className={cn('session-item copilot-session-item', active && 'session-item--active')}
                        aria-current={active ? 'page' : undefined}
                        aria-label={`${s.title}，${sessionGenerating ? '生成中' : s.status === 'active' ? '进行中' : '已完成'}${s.unread ? `，${s.unread} 条未读` : ''}`}
                      >
                        <div className="session-item__top">
                          <div className="session-item__title">
                            {s.pinned && <Pin className="h-3 w-3 shrink-0 text-[var(--brand)]" />}
                            <span className="truncate">{s.title}</span>
                          </div>
                          {s.unread ? (
                            <span className="session-item__unread">{s.unread}</span>
                          ) : (
                            <time className="session-item__time">{s.time}</time>
                          )}
                        </div>
                        <div className="session-item__preview">{s.preview || '暂无消息'}</div>
                        <div className="session-item__meta">
                          <span className="session-item__agent">{s.agent}</span>
                          <Badge tone={sessionGenerating ? 'info' : s.status === 'active' ? 'brand' : 'success'} className="text-[10px]">
                            {sessionGenerating ? '生成中' : s.status === 'active' ? '进行中' : '已完成'}
                          </Badge>
                        </div>
                      </button>
                      {canMutate && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDelete(s);
                          }}
                          className="copilot-session-item__delete"
                          aria-label={`删除会话：${s.title}`}
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ),
        )}
        {filteredCount === 0 && (
          <div className="copilot-sessions__empty">
            <Bot className="h-8 w-8" />
            <strong>{canMutate ? '还没有会话' : '暂无协作记录'}</strong>
            <span>{canMutate ? '点击「新会话」选择在岗专家开始协作' : '工作区会话证据将在此只读展示'}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export { SessionsSidebar };
export type { SessionsSidebarProps, SessionsSidebarItem };