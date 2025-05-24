import { createWorker } from "tesseract.js";

export async function recognizeText(imageData: string) {
  const worker = await createWorker("eng");

  const {
    data: { text },
  } = await worker.recognize(imageData);
  await worker.terminate();

  return text;
}
