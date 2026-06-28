import jsQR from "jsqr";

/**
 * Decodifica un QR a partir de un archivo de imagen (foto del QR).
 * Devuelve el texto contenido (p. ej. el payload "C1:…"). Lanza si no hay QR.
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height);
    if (!code) throw new Error("No QR code found in the image");
    return code.data;
  } finally {
    bitmap.close();
  }
}
