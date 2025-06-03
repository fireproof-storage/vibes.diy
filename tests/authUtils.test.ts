import { describe, it, expect, beforeEach } from 'vitest';
import { verifyToken } from '../app/utils/auth';

describe('auth utils', () => {
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
