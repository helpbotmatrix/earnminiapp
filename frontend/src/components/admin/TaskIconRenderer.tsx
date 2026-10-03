import React, { useEffect, useState } from 'react';

/** Resolve task icon to a browser-safe URL (handles ./assets, /assets, uploads). */
export function resolveTaskIconSrc(icon: string): string {
  const raw = (icon || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;
  let path = raw.replace(/^\.\//, '').replace(/^\.\.\//, '');
  if (path.startsWith('assets/')) path = '/' + path;
  if (path.startsWith('/assets/')) return path;
  if (path.startsWith('/uploads/')) return path;
  if (path.startsWith('uploads/')) return '/' + path;
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

function isTaskIconImagePath(icon: string): boolean {
  const s = (icon || '').trim().toLowerCase();
  if (!s) return false;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return true;
  if (s.startsWith('/uploads/') || s.startsWith('uploads/') || s.includes('/uploads/')) return true;
  if (s.includes('/assets/') || s.startsWith('assets/') || s.startsWith('./assets/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|ico)(\?.*)?$/i.test(s);
}

/** Never shows raw file paths as text in the admin UI. */
export const TaskIconRenderer: React.FC<{ icon?: string; size?: number; style?: React.CSSProperties }> = ({
  icon = '🎯',
  size = 28,
  style,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [icon]);

  const isImage = !hasError && typeof icon === 'string' && isTaskIconImagePath(icon);

  if (isImage) {
    const src = resolveTaskIconSrc(icon);
    return (
      <img
        src={src}
        alt=""
        onError={() => setHasError(true)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          borderRadius: '7px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
          ...style,
        }}
      />
    );
  }

  const fallback =
    typeof icon === 'string' && icon.length <= 4 && !icon.includes('/') && !icon.includes('.')
      ? icon
      : '🎯';

  return (
    <span
      style={{
        fontSize: `${Math.max(14, size - 4)}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {fallback}
    </span>
  );
};

export default TaskIconRenderer;
