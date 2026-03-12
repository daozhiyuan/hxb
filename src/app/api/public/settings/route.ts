import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

const DEFAULT_SETTINGS = {
  systemName: '客户管理系统',
  logoUrl: '/logo.png',
  primaryColor: '#0070f3',
  enableNotifications: true,
  defaultLanguage: 'zh-CN',
  dataRetentionDays: 365,
  maintenanceMode: false,
  debugMode: false,
  copyright: '© 2024 客户管理系统. 保留所有权利。',
  companyName: '',
  icp: '',
};

const ensureDirectory = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getSettings = () => {
  ensureDirectory();
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('读取系统设置失败:', error);
  }
  return DEFAULT_SETTINGS;
};

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(
      {
        systemName: settings.systemName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        defaultLanguage: settings.defaultLanguage,
        copyright: settings.copyright,
        companyName: settings.companyName,
        icp: settings.icp,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return NextResponse.json(
      { message: '获取系统设置失败', error: String(error) },
      { status: 500 }
    );
  }
}
