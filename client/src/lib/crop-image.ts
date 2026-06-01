export type CropArea = { x: number; y: number; width: number; height: number };

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

// Recorta a area selecionada num canvas e devolve um data URL JPEG.
// Reduz a qualidade ate caber no limite aceito pelo endpoint de avatar (string < 2MB).
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  maxLength = 1_900_000,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponivel neste navegador");

  // Limita o lado do avatar para manter o data URL pequeno e nitido.
  const outputSize = Math.min(512, Math.max(1, Math.round(pixelCrop.width)));
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  let quality = 0.92;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxLength && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}
