import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  if (session.user.role !== "PARTNER") {
    return NextResponse.json({ error: '禁止访问' }, { status: 403 })
  }
  
  try {
    const customers = await prisma.customer.findMany({
      where: {
        registeredByPartnerId: session.user.id
      },
      orderBy: {
        registrationDate: "desc"
      }
    })
    
    return NextResponse.json(customers)
  } catch (error) {
    console.error("获取客户列表失败:", error)
    return NextResponse.json({ error: "获取客户列表失败" }, { status: 500 })
  }
} 