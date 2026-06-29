export const cn = (...inputs: Array<string | false | null | undefined>): string =>
  inputs.filter(Boolean).join(' ');

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const newId = (): string =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

export const initials = (name: string): string => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
};

export const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1) + '…' : s;
