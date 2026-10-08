import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const ROLE_RANK = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export async function getMembership(userId, workspaceId) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}
