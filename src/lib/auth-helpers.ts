import { Session } from 'next-auth';
import { Role } from '@prisma/client';

/**
 * 检查用户是否有权限访问某个资源
 * @param session 用户会话
 * @param resourceOwnerId 资源所有者ID（可选）
 * @param requiredRole 所需角色（可选）
 * @returns 是否有权限
 */
export function hasPermission(
  session: Session | null,
  resourceOwnerId?: number | null,
  requiredRole?: Role | Role[]
): boolean {
  // 如果会话不存在，没有权限
  if (!session || !session.user) {
    return false;
  }

  // 超级管理员拥有所有权限
  if (session.user.role === Role.SUPER_ADMIN) {
    return true;
  }

  // 如果需要特定角色
  if (requiredRole) {
    // 如果是角色数组，检查用户角色是否在其中
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(session.user.role)) {
        return false;
      }
    } 
    // 如果是单个角色，直接比较
    else if (session.user.role !== requiredRole) {
      return false;
    }
  }

  // 如果有资源所有者ID，检查是否是资源拥有者
  if (resourceOwnerId && Number(session.user.id) !== Number(resourceOwnerId)) {
    // 如果不是资源拥有者，只有管理员可以访问
    return session.user.role === Role.ADMIN;
  }

  // 通过所有检查
  return true;
}

/**
 * 检查用户是否是管理员或超级管理员
 * @param session 用户会话
 * @returns 是否是管理员
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN;
}

/**
 * 检查用户是否是超级管理员
 * @param session 用户会话
 * @returns 是否是超级管理员
 */
export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.role === Role.SUPER_ADMIN;
}

/**
 * 检查用户是否是合作伙伴
 * @param session 用户会话
 * @returns 是否是合作伙伴
 */
export function isPartner(session: Session | null): boolean {
  return session?.user?.role === Role.PARTNER;
} 