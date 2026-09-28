/**
 * Avatar
 *
 * Draws a coloured circle with initials. Used in tables and the topbar.
 */

import { initialsOf } from '../utils/stringUtils';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  title?: string;
}

function deterministicHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 360;
}

export function Avatar({ name, size = 32, color, title }: AvatarProps) {
  const background = color ?? `hsl(${deterministicHue(name)}, 55%, 40%)`;
  return (
    <span
      title={title ?? name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background,
        color: '#fff',
        fontWeight: 600,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
        userSelect: 'none',
      }}
    >
      {initialsOf(name, 2)}
    </span>
  );
}
