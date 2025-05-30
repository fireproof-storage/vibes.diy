import { describe, it, expect, beforeEach } from 'vitest';
import { parseToken, verifyToken } from '../app/utils/auth';

// helper to create a simple base64url encoded string
const b64url = (str: string) => Buffer.from(str).toString('base64url');

describe('auth utils', () => {
  describe('parseToken', () => {
    it('returns payload for valid token', () => {
      const payload = { userId: '123', exp: 9999999999 };
      const token = `${b64url('{}')}.${b64url(JSON.stringify(payload))}.sig`;
      expect(parseToken(token)).toEqual(payload);
    });

    it('returns null for malformed token', () => {
      expect(parseToken('bad.token')).toBeNull();
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      // ensure DEV mode so verifyToken short circuits
      (import.meta as any).env = { DEV: true };
    });

    it('returns true in DEV environment', async () => {
      await expect(verifyToken('any.token')).resolves.toBe(true);
    });
  });
});
