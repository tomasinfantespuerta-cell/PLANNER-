/**
 * Reduce una foto del móvil (varios MB) a una imagen pequeña (máx. 800 px,
 * JPEG) para guardarla junto a la receta. Así se sincroniza rápido y funciona
 * sin conexión, sin necesitar un almacén de archivos aparte.
 */
export async function photoToDataUrl(file: File, maxSide = 800, quality = 0.7): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => null)
  const source: CanvasImageSource & { width: number; height: number } =
    bitmap ?? (await loadImage(URL.createObjectURL(file)))
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h)
  bitmap?.close()
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la foto'))
    img.src = src
  })
}
