const colors = ['#0b7a62', '#5b3fd6', '#c2335a', '#b45309', '#1d6fb8', '#7e3ba8'];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
