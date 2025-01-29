import { deflate, inflate } from 'pako';
import { encode as base64Encode, decode as base64Decode } from 'base64-arraybuffer';

export function compress(data: string): string {
  const compressed = deflate(data);
  return base64Encode(compressed);
}

export function decompress(data: string): string {
  const compressed = base64Decode(data);
  const decompressed = inflate(new Uint8Array(compressed));
  return new TextDecoder().decode(decompressed);
}

export function shouldCompress(value: string, threshold: number): boolean {
  return new TextEncoder().encode(value).length > threshold;
}