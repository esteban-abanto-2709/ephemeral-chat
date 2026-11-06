const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSide = 1600;
const quality = 0.8;

export async function compressPhoto(file: File): Promise<File> {
  if (!photoTypes.includes(file.type)) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const photo = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (photo.size >= file.size) {
      return file;
    }
    return new File([photo], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
