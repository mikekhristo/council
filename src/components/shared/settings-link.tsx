import Link from 'next/link';
import { Icon } from './icon';

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      title="Settings"
      aria-label="Settings"
      className="icon-btn"
    >
      <Icon name="gear" size={13} />
    </Link>
  );
}
