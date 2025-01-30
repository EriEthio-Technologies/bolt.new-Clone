const MAX_BYTES = 512; // Only check first 512 bytes

export function isBinary(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);
  const length = Math.min(view.length, MAX_BYTES);
  
  // Check for common binary file signatures
  if (length >= 2) {
    // Check for UTF-16 BOM
    if ((view[0] === 0xFF && view[1] === 0xFE) || (view[0] === 0xFE && view[1] === 0xFF)) {
      return false;
    }
  }
  
  if (length >= 3) {
    // Check for UTF-8 BOM
    if (view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
      return false;
    }
  }
  
  // Count null bytes and control characters
  let nullCount = 0;
  let controlCount = 0;
  
  for (let i = 0; i < length; i++) {
    if (view[i] === 0) {
      nullCount++;
    } else if (view[i] < 7 || (view[i] > 14 && view[i] < 32)) {
      controlCount++;
    }
    
    // If we have enough evidence that this is a binary file, return early
    if (nullCount > length * 0.1 || controlCount > length * 0.3) {
      return true;
    }
  }
  
  return false;
}

export function isText(buffer: ArrayBuffer): boolean {
  return !isBinary(buffer);
} 