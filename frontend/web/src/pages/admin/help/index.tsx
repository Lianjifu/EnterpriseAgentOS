/**
 * 管理员侧 — 帮助中心。
 * 复用 pages/shared/HelpCenter,固定 audience='admin'。
 */
import HelpCenter from '@/pages/shared/HelpCenter';

export default function AdminHelp() {
  return <HelpCenter audience="admin" />;
}