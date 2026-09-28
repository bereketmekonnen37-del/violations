import { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { TaskAttachment } from '../../types';
import { getAttachmentSignedUrl } from './tasksApi';

const iconFor = (mime: string, name: string) => {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    return FileText;
  }
  return FileText;
};

const formatSize = (bytes: number): string => {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentChip = ({ file }: { file: TaskAttachment }) => {
  const [loading, setLoading] = useState(false);
  const Icon = iconFor(file.mimeType, file.fileName);

  const onOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = await getAttachmentSignedUrl(file.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : 'Failed to open attachment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-blue-line bg-white px-2.5 py-1.5 text-left text-xs font-medium text-ink-700 transition hover:border-brand-blue hover:bg-brand-blue-soft"
    >
      <Icon size={13} className="shrink-0 text-brand-blue" />
      <span className="truncate">{file.fileName}</span>
      {file.sizeBytes > 0 && (
        <span className="shrink-0 text-[10px] text-ink-500">
          {formatSize(file.sizeBytes)}
        </span>
      )}
      {loading ? (
        <Loader2 size={12} className="ml-1 shrink-0 animate-spin" />
      ) : (
        <Download size={12} className="ml-1 shrink-0 opacity-60" />
      )}
    </button>
  );
};
