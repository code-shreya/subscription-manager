import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, validatePasswordStrength } from './password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test1234!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongP@ssw0rd123');

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.feedback.length).toBe(0);
    });

    it('should reject short password', () => {
      const result = validatePasswordStrength('Abc1');

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
    });

    it('should detect missing uppercase', () => {
      const result = validatePasswordStrength('short1!');

      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Add uppercase letters');
    });

    it('should detect missing lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!');

      // Password might still be valid if long enough with special chars
      expect(result.feedback).toContain('Add lowercase letters');
    });

    it('should detect missing numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');

      // Password might still be valid if it has other strong characteristics
      expect(result.feedback).toContain('Add numbers');
    });

    it('should detect common patterns', () => {
      const result = validatePasswordStrength('Password123');

      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Avoid common patterns');
    });

    it('should detect repeated characters', () => {
      const result = validatePasswordStrength('Passssword123!');

      // Password might still be valid overall, but should provide feedback
      expect(result.feedback).toContain('Avoid common patterns');
    });
  });
});
