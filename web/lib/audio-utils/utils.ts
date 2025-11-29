import WavEncoder from "wav-encoder";

export async function pcm16Base64ToArrayBuffer(
  base64PCM: string,
): Promise<ArrayBuffer> {
  // 1. Base64 decode → Uint8Array
  const binary = atob(base64PCM);
  const pcmBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    pcmBytes[i] = binary.charCodeAt(i);
  }

  // 2. Convert PCM16LE → Float32
  const sampleCount = pcmBytes.length / 2;
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const lo = pcmBytes[i * 2];
    const hi = pcmBytes[i * 2 + 1];
    const int16 = (hi << 8) | lo;
    samples[i] = (int16 > 32767 ? int16 - 65536 : int16) / 32768;
  }

  return samples.buffer;
}

export async function arrayBufferToWav(
  samples: ArrayBuffer,
): Promise<ArrayBuffer> {
  // Encode WAV
  const audioData = {
    sampleRate: 24000,
    channelData: [new Float32Array(samples)],
  };

  const wavArrayBuffer = await WavEncoder.encode(audioData);
  return wavArrayBuffer;
}
