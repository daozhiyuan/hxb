import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type ReportItem = {
  name: string;
  path: string;
  updatedAt: string;
  sizeBytes: number;
};

function listSiteAuditReports(): ReportItem[] {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) return [];

  return fs
    .readdirSync(reportsDir)
    .filter((n) => n.startsWith('site-audit-') && n.endsWith('.md'))
    .map((name) => {
      const fullPath = path.join(reportsDir, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        path: `/reports/${name}`,
        updatedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '未授权访问' }, { status: 403 });
    }

    const reports = listSiteAuditReports();
    const latest = reports[0] || null;

    return NextResponse.json(
      {
        status: 'OK',
        generatedAt: new Date().toISOString(),
        latestSiteAudit: latest,
        siteAuditCount: reports.length,
        suggestedCommands: [
          'npm run typecheck',
          'npm run e2e:auth:public',
          'npm run audit:site',
          'npm run verify:public',
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取质量概览失败:', error);
    return NextResponse.json(
      { message: '获取质量概览失败', error: String(error) },
      { status: 500 }
    );
  }
}
