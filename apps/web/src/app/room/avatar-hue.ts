const hues = [20, 70, 150, 200, 250, 290, 330];

export function avatarHue(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return hues[Math.abs(hash) % hues.length];
}
