/**
 * TrustStrip — 合规与信任徽标条
 *
 * 用于登录页底部或安全设置卡片。Hover 揭示 sub 文案。
 * 不依赖 web-ui Badge 组件,因为这里走玻璃质感主题需要自定义样式。
 */
import type { ReactNode } from 'react';

export interface TrustItem {
  label: string;
  sub?: string;
  icon?: ReactNode;
}

export function TrustStrip({ items, className }: { items: TrustItem[]; className?: string }) {
  return (
    <ul
      role="list"
      aria-label="合规与信任标识"
      className={
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] ' +
        (className ?? '')
      }
    >
      {items.map((it, i) => (
        <li
          key={i}
          className="group relative inline-flex items-center gap-1.5 rounded-md
                     bg-white/10 px-2.5 py-1 text-white/85 ring-1 ring-white/15
                     backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white
                     dark:bg-white/5 dark:ring-white/10"
        >
          {it.icon ? <span className="text-white/70 group-hover:text-white">{it.icon}</span> : null}
          <span className="font-medium tracking-wide">{it.label}</span>
          {it.sub ? (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px]
                         -translate-x-1/2 rounded-md border border-white/20 bg-slate-900/95 px-2.5 py-1.5
                         text-[10px] font-normal leading-relaxed text-white opacity-0 shadow-lg
                         transition-opacity duration-150 group-hover:opacity-100
                         dark:border-slate-700/60"
            >
              {it.sub}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}