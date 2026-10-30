import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Authentication hashing', () => {
  it('calls bcrypt.hash with 10 salt rounds and bcrypt.compare returns true for valid passwords', async () => {
    const password = 'StrongPassword123!';
    const hashSpy = vi.spyOn(bcrypt, 'hash');
    const compareSpy = vi.spyOn(bcrypt, 'compare');

    const passwordHash = await bcrypt.hash(password, 10);

    expect(hashSpy).toHaveBeenCalledWith(password, 10);
    expect(await bcrypt.compare(password, passwordHash)).toBe(true);
    expect(compareSpy).toHaveBeenCalledWith(password, passwordHash);

    hashSpy.mockRestore();
    compareSpy.mockRestore();
  });
});
