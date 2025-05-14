import { Session } from 'next-auth';
import { Role } from '@prisma/client';
import { signOut } from 'next-auth/react';

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

/**
 * 认证辅助函数
 * 提供一系列与认证和会话相关的辅助函数
 */

/**
 * 检查会话是否有效
 * @param session 当前会话
 * @returns 会话是否有效
 */
export function isValidSession(session: Session | null): boolean {
  if (!session) return false;
  
  // 检查用户对象是否存在
  if (!session.user) return false;
  
  // 检查用户ID是否存在且为有效数字
  const userId = session.user.id;
  if (userId === undefined || userId === null) return false;
  
  // 检查角色是否存在
  if (!session.user.role) return false;
  
  return true;
}

/**
 * 尝试修复会话，如果无法修复则登出
 * @param callbackUrl 登出后重定向的URL
 */
export async function repairSessionOrSignOut(callbackUrl: string = '/login'): Promise<void> {
  try {
    // 强制刷新会话
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'repair',
        timestamp: Date.now() 
      }),
    });
    
    // 等待会话修复
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 刷新会话后仍有问题，则登出
    const response = await fetch('/api/auth/session');
    const sessionData = await response.json();
    
    if (!sessionData?.user?.id) {
      // 会话无法修复，执行登出
      await signOut({ callbackUrl: `${callbackUrl}?error=SessionCorrupted` });
    }
  } catch (error) {
    console.error('[Auth Helper] 修复会话失败:', error);
    // 出错时也执行登出
    await signOut({ callbackUrl: `${callbackUrl}?error=SessionCorrupted` });
  }
}

/**
 * 解析用户ID，确保为数字类型
 * @param userId 用户ID（可能是字符串或数字）
 * @returns 处理后的数字类型ID
 */
export function parseUserId(userId: string | number | undefined | null): number | null {
  if (userId === undefined || userId === null) return null;
  
  // 尝试转换为数字
  const parsedId = Number(userId);
  
  // 检查是否为有效数字
  if (isNaN(parsedId)) return null;
  
  return parsedId;
} 