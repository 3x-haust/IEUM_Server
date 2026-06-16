import sharp from 'sharp';

export async function writeBlankImage(path: string): Promise<void> {
  await sharp({
    create: {
      width: 320,
      height: 180,
      channels: 3,
      background: '#ffffff'
    }
  }).png().toFile(path);
}
