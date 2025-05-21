import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';

// 设置为动态路由
export const dynamic = 'force-dynamic';

/**
 * GET: 获取指定合作伙伴的详细资料（仅管理员可访问）
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查管理员权限
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '需要管理员权限' }, { status: 403 });
    }
    
    const userId = parseInt(params.id);
    
    if (isNaN(userId)) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }
    
    // 获取合作伙伴的详细资料
    const partner = await prisma.user.findUnique({
      where: { 
        id: userId 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
        // 银行账户信息
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        // 发票信息
        taxId: true,
        invoiceTitle: true,
        invoiceAddress: true,
        invoicePhone: true,
        // 客户统计
        _count: {
          select: {
            customers: true
          }
        }
      }
    });
    
    if (!partner) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 返回合作伙伴资料
    return NextResponse.json(partner);
  } catch (error) {
    console.error('获取合作伙伴资料失败:', error);
    return NextResponse.json(
      { message: '获取合作伙伴资料失败', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH: 更新指定合作伙伴的资料（仅管理员可访问）
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查管理员权限
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '需要管理员权限' }, { status: 403 });
    }
    
    const userId = parseInt(params.id);
    
    if (isNaN(userId)) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }
    
    // 获取请求体数据
    const data = await request.json();
    
    // 构建更新数据对象，只包含有效字段
    const updateData: any = {};
    
    // 基本信息字段
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.role !== undefined && ['ADMIN', 'PARTNER', 'USER'].includes(data.role)) {
      updateData.role = data.role;
    }
    
    // 公司基本信息字段
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    
    // 银行账户信息字段
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.accountHolder !== undefined) updateData.accountHolder = data.accountHolder;
    
    // 发票信息字段
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.invoiceTitle !== undefined) updateData.invoiceTitle = data.invoiceTitle;
    if (data.invoiceAddress !== undefined) updateData.invoiceAddress = data.invoiceAddress;
    if (data.invoicePhone !== undefined) updateData.invoicePhone = data.invoicePhone;
    
    // 如果没有有效的更新字段，返回错误
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: '没有提供有效的更新字段' }, { status: 400 });
    }
    
    // 确保用户存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    if (!existingUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { 
        id: userId 
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
        // 银行账户信息
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        // 发票信息
        taxId: true,
        invoiceTitle: true,
        invoiceAddress: true,
        invoicePhone: true,
      }
    });
    
    // 返回更新后的用户资料
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('更新合作伙伴资料失败:', error);
    return NextResponse.json(
      { message: '更新合作伙伴资料失败', error: String(error) },
      { status: 500 }
    );
  }
} 