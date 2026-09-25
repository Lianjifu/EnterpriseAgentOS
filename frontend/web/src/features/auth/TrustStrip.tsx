/**
 * TrustStrip — 合规与信任徽标条
 *
 * 用于登录页底部或安全设置卡片。Hover 揭示 sub 文案。
 * 不依赖 web-ui Badge 组件,因为这里走玻璃质感主题需要自定义样式。
 *
 * `tone` 控制配色:
 *  - dark(默认):深色玻璃质感,用于 Settings 等深色 panel
 *  - light:亮色卡片,用于登录页 form panel 等浅色背景
 *                (在 .dark 下自动 fallback 到 dark 变体)
 */
import type { ReactNode } from 'react';

export interface TrustItem {
  label: string;
  sub?: string;
  icon?: ReactNode;
}

export interface TrustStripProps {
  items: TrustItem[];
  className?: string;
  tone?: 'light' | 'dark';
}

interface ToneClasses {
  item: string;
  icon: string;
  tooltip: string;
}

function getToneClasses(tone: 'light' | 'dark'): ToneClasses {
  if (tone === 'light') {
    return {
      // light 配色同时含 dark: fallback — .dark 模式下走深色玻璃质感
      item:
        'bg-white/80 text-[var(--text-secondary)] ring-1 ring-[var(--border)] ' +
        'hover:bg-white hover:text-[var(--text)] ' +
        'dark:bg-white/10 dark:text-white/85 dark:ring-white/15 dark:hover:bg-white/15',
      icon:
        'text-[var(--text-muted)] group-hover:text-[var(--brand)] ' +
        'dark:text-white/70 dark:group-hover:text-white',
      tooltip:
        'border border-[var(--border)] bg-white text-[var(--text-secondary)] ' +
        'shadow-sm ' +
        'dark:border-white/20 dark:bg-slate-900/95 dark:text-white dark:shadow-lg',
    };
  }
  // dark tone
  return {
    item:
      'bg-white/10 text-white/85 ring-1 ring-white/15 ' +
      'hover:bg-white/15 hover:text-white ' +
      'dark:bg-white/5 dark:ring-white/10',
    icon: 'text-white/70 group-hover:text-white',
    tooltip:
      'border border-white/20 bg-slate-900/95 text-white shadow-lg ' +
      'dark:border-slate-700/60',
  };
}

export function TrustStrip({ items, className, tone = 'dark' }: TrustStripProps) {
  const t = getToneClasses(tone);
  return (
    <ul
      role="list"
      aria-label="合规与信任标识"
      className={
        'flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] ' +
        (className ?? '')
      }
    >
      {items.map((it, i) => (
        <li
          key={i}
          className={`group relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5
                     backdrop-blur-sm transition-all ${t.item}`}
        >
          {it.icon ? <span className={t.icon}>{it.icon}</span> : null}
          <span className="font-medium tracking-wide">{it.label}</span>
          {it.sub ? (
            <span
              role="tooltip"
              className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px]
                         -translate-x-1/2 rounded-md px-2.5 py-1.5
                         text-[11px] font-normal leading-relaxed opacity-0
                         transition-opacity duration-150 group-hover:opacity-100 ${t.tooltip}`}
            >
              {it.sub}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}