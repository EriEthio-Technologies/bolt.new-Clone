import crypto from 'crypto';

export class Encryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits
  private readonly tagLength = 16; // 128 bits
  private readonly key: Buffer;
  private readonly salt: Buffer;
  private static readonly VERSION = 1; // For future migrations

  constructor(secretKey?: string) {
    if (secretKey) {
      // Use a proper salt and cost parameters for key derivation
      const salt = crypto.randomBytes(16);
      const N = 16384; // CPU/memory cost parameter
      const r = 8;    // Block size parameter
      const p = 1;    // Parallelization parameter
      
      this.key = crypto.scryptSync(secretKey, salt, this.keyLength, { N, r, p });
    } else {
      throw new Error('Secret key is required for encryption');
    }
  }

  encrypt(data: string): string {
    if (!data) {
      throw new Error('Data is required for encryption');
    }

    try {
      // Create IV for this encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.tagLength
      });

      // Encrypt data
      const encryptedContent = Buffer.concat([
        cipher.update(Buffer.from(data, 'utf8')),
        cipher.final()
      ]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine all parts: VERSION (1 byte) + SALT (16 bytes) + IV (12 bytes) + TAG (16 bytes) + CIPHERTEXT
      const combined = Buffer.concat([
        Buffer.from([Encryption.VERSION]),
        this.salt,
        iv,
        tag,
        encryptedContent
      ]);

      // Return as base64 string
      return combined.toString('base64');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }
      throw new Error('Encryption failed with unknown error');
    }
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Encrypted data is required for decryption');
    }

    try {
      // Convert from base64 to buffer
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const version = combined[0];
      if (version !== Encryption.VERSION) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      const salt = combined.slice(1, 17);
      const iv = combined.slice(17, 17 + this.ivLength);
      const tag = combined.slice(17 + this.ivLength, 17 + this.ivLength + this.tagLength);
      const ciphertext = combined.slice(17 + this.ivLength + this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.tagLength
      });

      // Set auth tag
      decipher.setAuthTag(tag);

      // Decrypt and return
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }
      throw new Error('Decryption failed with unknown error');
    }
  }

  // Helper method to encrypt object fields
  encryptFields<T extends object>(
    data: T,
    fields: (keyof T)[]
  ): T & { [key: string]: { encrypted: string; iv: string; tag: string } } {
    const result = { ...data };

    fields.forEach((field) => {
      if (typeof result[field] === 'string') {
        const encrypted = this.encrypt(result[field] as string);
        result[field] = encrypted as any;
      }
    });

    return result;
  }

  // Helper method to decrypt object fields
  decryptFields<T extends object>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...data };

    fields.forEach((field) => {
      const encryptedData = result[field] as any;
      if (encryptedData?.encrypted && encryptedData?.iv && encryptedData?.tag) {
        result[field] = this.decrypt(
          encryptedData.encrypted,
          encryptedData.iv,
          encryptedData.tag
        ) as any;
      }
    });

    return result;
  }
}