import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

type OverviewPayload = {
  runtime: {
    status: 'OK';
    timestamp: string;
    nodeEnv: string;
    uptimeSeconds: number;
  };
  counts: {
    users: number;
    customers: number;
    appeals: number;
    pendingAppeals: number;
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ message: '未授权访问' }, { status: 403 });
    }

    const [users, customers, appeals, pendingAppeals] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.appeal.count(),
      prisma.appeal.count({ where: { status: 'PENDING' } }),
    ]);

    const payload: OverviewPayload = {
      runtime: {
        status: 'OK',
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'unknown',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      counts: {
        users,
        customers,
        appeals,
        pendingAppeals,
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('获取系统概览失败:', error);
    return NextResponse.json(
      { message: '获取系统概览失败', error: String(error) },
      { status: 500 }
    );
  }
}
