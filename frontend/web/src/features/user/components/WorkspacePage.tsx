import type { ReactNode } from 'react';

export function WorkspacePage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10 ${className}`.trim()}>
      {children}
    </div>
  );
}
