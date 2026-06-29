import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypts and decrypts user-supplied LostArk API keys using AES-256-GCM.
 *
 * Storage format: <ivHex>:<ciphertextHex>:<tagHex>
 * The plaintext key is NEVER stored — only the encrypted blob is persisted.
 *
 * Required env: API_ENCRYPTION_KEY — 64 hex chars (= 32 bytes).
 */
@Injectable()
export class ApiKeyCryptoService {
  private readonly logger = new Logger(ApiKeyCryptoService.name);
  private readonly encryptionKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const hexKey = this.config.get<string>('API_ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'API_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate with: openssl rand -hex 32',
      );
    }
    this.encryptionKey = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  }

  decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted API key format');
    const [ivHex, ciphertextHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (tag.length !== TAG_LENGTH) throw new Error('Invalid GCM tag length');

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Short, deterministic identifier safe to log or store in Redis (no key material). */
  hash(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  /** Returns a masked representation for status APIs: 'sk-****...****' */
  mask(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return `${apiKey.substring(0, 3)}${'*'.repeat(Math.max(apiKey.length - 6, 4))}${apiKey.slice(-3)}`;
  }
}
