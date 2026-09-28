/**
 * 极简 markdown 渲染器 — 仅覆盖 Prompt 文档中实际出现的语法:
 *   # / ## / ### 标题、- 列表、**bold** / *italic* / `code`、``` 代码块、> 引用、[text](url) 链接、段落、空行。
 * 不解析嵌套 / 不支持 HTML / 不引入外部依赖。
 */
import { Fragment, type ReactNode } from 'react';

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  value: string;
  href?: string;
}

function tokenizeInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf.length > 0) {
      tokens.push({ type: 'text', value: buf });
      buf = '';
    }
  };
  while (i < line.length) {
    const ch = line[i];
    // 反引号内联代码
    if (ch === '`') {
      const end = line.indexOf('`', i + 1);
      if (end > 0) {
        flush();
        tokens.push({ type: 'code', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // 链接 [text](url)
    if (ch === '[') {
      const close = line.indexOf(']', i + 1);
      const openParen = close > 0 ? line.indexOf('(', close) : -1;
      const closeParen = openParen > 0 ? line.indexOf(')', openParen) : -1;
      if (close > 0 && openParen === close + 1 && closeParen > openParen) {
        const text = line.slice(i + 1, close);
        const href = line.slice(openParen + 1, closeParen);
        flush();
        tokens.push({ type: 'link', value: text, href });
        i = closeParen + 1;
        continue;
      }
    }
    // **bold**
    if (ch === '*' && line[i + 1] === '*') {
      const end = line.indexOf('**', i + 2);
      if (end > 0) {
        flush();
        tokens.push({ type: 'bold', value: line.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // *italic*
    if (ch === '*' && line[i + 1] !== '*') {
      const end = line.indexOf('*', i + 1);
      if (end > 0) {
        flush();
        tokens.push({ type: 'italic', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return tokens;
}

function renderInline(tokens: InlineToken[]): ReactNode {
  return tokens.map((t, idx) => {
    switch (t.type) {
      case 'bold': return <strong key={idx} className="font-semibold text-[var(--text)]">{t.value}</strong>;
      case 'italic': return <em key={idx} className="italic">{t.value}</em>;
      case 'code': return <code key={idx} className="rounded bg-[var(--bg-elevated)] px-1 py-0.5 font-mono text-[0.92em] text-[var(--brand)]">{t.value}</code>;
      case 'link': return <a key={idx} href={t.href} target="_blank" rel="noreferrer" className="text-[var(--brand)] underline decoration-dotted underline-offset-2 hover:opacity-80">{t.value}</a>;
      default: return <Fragment key={idx}>{t.value}</Fragment>;
    }
  });
}

export function MarkdownView({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++} className="my-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-[11px] leading-5 text-[var(--text)]">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // 标题
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const style = level === 1
        ? 'mt-4 mb-2 text-base font-semibold tracking-tight text-[var(--text)]'
        : level === 2
          ? 'mt-4 mb-2 text-sm font-semibold text-[var(--text)]'
          : 'mt-3 mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]';
      blocks.push(
        level === 1
          ? <h1 key={key++} className={style}>{renderInline(tokenizeInline(text))}</h1>
          : level === 2
            ? <h2 key={key++} className={style}>{renderInline(tokenizeInline(text))}</h2>
            : <h3 key={key++} className={style}>{renderInline(tokenizeInline(text))}</h3>,
      );
      i += 1;
      continue;
    }

    // 引用
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [line.slice(2)];
      i += 1;
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote key={key++} className="my-2 border-l-2 border-[var(--brand)] bg-[var(--brand-light)]/40 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          {quoteLines.map((q, idx) => (
            <p key={idx} className={idx === 0 ? '' : 'mt-1'}>{renderInline(tokenizeInline(q))}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 无序列表
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="my-2 space-y-1.5 pl-4 text-xs leading-6 text-[var(--text-secondary)] marker:text-[var(--brand)]" style={{ listStyleType: 'disc' }}>
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(tokenizeInline(it))}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1.5 pl-4 text-xs leading-6 text-[var(--text-secondary)]">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(tokenizeInline(it))}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // 段落:把连续非空行合并
    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|```|>\s|[-*]\s|\d+\.\s)/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="my-2 text-xs leading-6 text-[var(--text-secondary)]">
        {renderInline(tokenizeInline(paraLines.join(' ')))}
      </p>,
    );
  }

  return <div className="space-y-0">{blocks}</div>;
}