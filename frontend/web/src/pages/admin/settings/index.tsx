/**
 * 管理员侧 — 平台设置。
 * 复用 pages/shared/AccountSettings,固定 audience='admin'。
 */
import AccountSettings from '@/pages/shared/AccountSettings';

export default function AdminSettings() {
  return <AccountSettings audience="admin" />;
}