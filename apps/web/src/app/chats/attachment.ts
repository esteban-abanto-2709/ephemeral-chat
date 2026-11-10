import { I18n } from '../i18n/i18n';

export interface Attachment {
  kind: 'image' | 'file' | 'voice' | 'sticker';
  name: string;
  size: number;
  url: string;
  seconds?: number;
}

export interface Outgoing {
  file: Attachment;
  caption: string;
}

export interface Quote {
  name: string;
  own: boolean;
  text: string;
  file?: Attachment;
  seq?: number;
}

export function describe(file: Attachment, i18n: I18n): string {
  switch (file.kind) {
    case 'image':
      return i18n.t('attachment.photo');
    case 'file':
      return file.name;
    case 'voice':
      return i18n.t('attachment.voice', { duration: duration(file.seconds ?? 0) });
    case 'sticker':
      return i18n.t('attachment.sticker');
  }
}

export function duration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1_000_000) {
    return `${Math.round(bytes / 1000)} KB`;
  }
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
