/**
 * 删除客户
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  try {
    const customerId = parseInt(params.id)
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 })
    }
    
    // 获取客户详情以检查权限
    const customer = await getSafeCustomerDetails(customerId)
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 })
    }
    
    // 使用权限辅助函数检查访问权限 - 只有管理员和超级管理员可以删除客户
    if (!hasPermission(session, null, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return NextResponse.json({ error: '没有权限删除此客户' }, { status: 403 })
    }
    
    // 删除与客户相关的所有跟进记录
    await prisma.followUp.deleteMany({
      where: { customerId }
    })
    
    // 删除客户与标签的关联
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        tags: {
          set: []
        }
      }
    })
    
    // 删除客户
    await prisma.customer.delete({
      where: { id: customerId }
    })
    
    return NextResponse.json({ message: '客户已成功删除' })
  } catch (error) {
    console.error("删除客户失败:", error)
    return NextResponse.json({ error: "删除客户失败" }, { status: 500 })
  }
} 