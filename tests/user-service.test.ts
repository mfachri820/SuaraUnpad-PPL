import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Role } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { userService } from '@/services/userService';
import { prisma } from '@/lib/prisma';

const mockedFindMany = vi.mocked(prisma.user.findMany);
const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedUpdate = vi.mocked(prisma.user.update);

describe('userService (white-box branch coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('queries without a role filter when no roleFilter argument is passed', async () => {
      mockedFindMany.mockResolvedValue([]);

      await userService.getAllUsers();

      expect(mockedFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined })
      );
    });

    it('queries with a role filter when roleFilter argument is passed', async () => {
      mockedFindMany.mockResolvedValue([]);

      await userService.getAllUsers('ADMIN' as Role);

      expect(mockedFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'ADMIN' } })
      );
    });
  });

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      const fakeUser = { id: 'user-1', email: 'a@unpad.ac.id' };
      mockedFindUnique.mockResolvedValue(fakeUser as never);

      const result = await userService.getUserById('user-1');

      expect(result).toEqual(fakeUser);
      expect(mockedFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      );
    });

    it('throws "User tidak ditemukan" when the user does not exist', async () => {
      mockedFindUnique.mockResolvedValue(null);

      await expect(userService.getUserById('missing-id')).rejects.toThrow(
        /User tidak ditemukan/i
      );
    });
  });

  describe('verifyUser', () => {
    it('throws "User tidak ditemukan" and never calls update when the user does not exist', async () => {
      mockedFindUnique.mockResolvedValue(null);

      await expect(userService.verifyUser('missing-id', true)).rejects.toThrow(
        /User tidak ditemukan/i
      );
      expect(mockedUpdate).not.toHaveBeenCalled();
    });

    it('updates isVerified when the user exists', async () => {
      mockedFindUnique.mockResolvedValue({ id: 'user-1' } as never);
      mockedUpdate.mockResolvedValue({
        id: 'user-1',
        email: 'a@unpad.ac.id',
        role: 'STUDENT',
        isVerified: true,
      } as never);

      const result = await userService.verifyUser('user-1', true);

      expect(mockedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { isVerified: true },
        })
      );
      expect(result.isVerified).toBe(true);
    });
  });
});