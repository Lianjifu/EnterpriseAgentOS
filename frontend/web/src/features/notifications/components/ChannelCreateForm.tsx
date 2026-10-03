/**
 * 新建渠道表单 — 选择飞书 / 企业微信 / 钉钉 / Web，并填写对接凭证。
 */
import { useState } from 'react';
import type { ChannelKind, CreateChannelVars } from '../schema';
import {
  CHANNEL_CONFIG_FIELDS,
  CHANNEL_KINDS,
  KIND_META,
  callbackHint,
  channelConfigReady,
  defaultChannelConfig,
} from './constants';

export function ChannelCreateForm({
  onCancel,
  onSubmit,
  isPending = false,
  defaultKind = 'feishu',
}: {
  onCancel: () => void;
  onSubmit: (vars: CreateChannelVars) => void;
  isPending?: boolean;
  defaultKind?: ChannelKind;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ChannelKind>(defaultKind);
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<Record<string, string>>(() => defaultChannelConfig(defaultKind));

  const switchKind = (next: ChannelKind) => {
    setKind(next);
    setConfig(defaultChannelConfig(next));
  };

  const meta = KIND_META[kind];
  const canSubmit = name.trim().length > 0 && target.trim().length > 0 && channelConfigReady(kind, config) && !isPending;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          name: name.trim(),
          kind,
          target: target.trim(),
          description: description.trim() || meta.summary,
          config: defaultChannelConfig(kind, config),
        });
      }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">对接平台</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="对接平台">
          {CHANNEL_KINDS.map((k) => {
            const item = KIND_META[k];
            const Icon = item.icon;
            const selected = kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => switchKind(k)}
                className={`rounded-xl border px-3 py-3 text-left transition ${selected ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${item.tone}`}><Icon className="h-3.5 w-3.5" /></span>
                <p className="mt-2 text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">{item.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="channel-name" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">渠道名称</label>
          <input id="channel-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:飞书 · 客服助手" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label htmlFor="channel-target" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{meta.targetLabel}</label>
          <input id="channel-target" type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={meta.targetPlaceholder} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="channel-desc" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea id="channel-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="简要描述此渠道的用途与可见范围" className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{meta.label} 对接配置</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">事件回调地址：<span className="font-mono">{callbackHint(kind)}</span></p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CHANNEL_CONFIG_FIELDS[kind].map((field) => (
            <div key={field.key}>
              <label htmlFor={`cfg-${field.key}`} className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{field.label}</label>
              <input
                id={`cfg-${field.key}`}
                type={field.secret ? 'password' : 'text'}
                autoComplete="off"
                value={config[field.key] ?? ''}
                onChange={(e) => setConfig((current) => ({ ...current, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 text-xs font-mono outline-none focus:border-[var(--brand)]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
        <button type="submit" disabled={!canSubmit} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-40">
          {isPending ? '创建中…' : '创建渠道'}
        </button>
      </div>
    </form>
  );
}
