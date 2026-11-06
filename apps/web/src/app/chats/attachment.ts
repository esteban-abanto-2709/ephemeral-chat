export interface Attachment {
  kind: 'image' | 'file' | 'voice' | 'sticker';
  name: string;
  size: number;
  url: string;
  seconds?: number;
}

export interface Quote {
  name: string;
  own: boolean;
  text: string;
  file?: Attachment;
}

export function describe(file: Attachment): string {
  switch (file.kind) {
    case 'image':
      return 'Photo';
    case 'file':
      return file.name;
    case 'voice':
      return `Voice message (${duration(file.seconds ?? 0)})`;
    case 'sticker':
      return 'Sticker';
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
