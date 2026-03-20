import {prisma} from '@/lib/prisma';
import { Role } from '@prisma/client';

export const userService = {
    async getAllUsers(roleFilter?: Role) {
        const users = await prisma.user.findMany({
            where: roleFilter ? {role: roleFilter} : undefined,
            select: {
                id: true,
                email: true,
                role: true,
                isVerified: true,
                avatarUrl: true,
                createdAt: true,
                studentProfile: true,
                lecturerProfile: true,
                adminProfile: true,
            },
            orderBy: {createdAt: 'desc'},
        });
        return users;
    },

    async getUserById(id: string) {
        const user = await prisma.user.findUnique({
            where: {id},
            select: {
                id: true,
                email: true,
                role: true,
                isVerified: true,
                avatarUrl: true,
                createdAt: true,
                studentProfile: true,
                lecturerProfile: true,
                adminProfile: true,
            },
        });

        if (!user) throw new Error('User tidak ditemukan');
        return user;
    },

    async verifyUser(id: string, isVerified: boolean) {
        const existingUser = await prisma.user.findUnique({where: {id}});
        if (!existingUser) throw new Error('User tidak ditemukan');

        const updatedUser = await prisma.user.update({
            where: { id },
                data: { isVerified },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isVerified: true,
                },
        });
        return updatedUser;
    }
}