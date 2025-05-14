import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 设置文件路径
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

// 确保data目录存在
const ensureDirectory = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 默认设置
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

/**
 * 读取系统设置
 */
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

/**
 * 保存系统设置
 */
const saveSettings = (settings: any) => {
  ensureDirectory();
  
  try {
    fs.writeFileSync(
      SETTINGS_FILE_PATH, 
      JSON.stringify(settings, null, 2), 
      'utf8'
    );
    return true;
  } catch (error) {
    console.error('保存系统设置失败:', error);
    return false;
  }
};

/**
 * GET: 获取系统设置 - 允许所有用户访问
 */
export async function GET(request: Request) {
  try {
    // 获取系统设置
    const settings = getSettings();
    
    // 返回公开设置信息并设置缓存控制
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
          // 设置缓存 5 分钟
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        }
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

/**
 * POST: 保存系统设置 - 仅限超级管理员
 */
export async function POST(request: Request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查超级管理员权限
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ message: '需要超级管理员权限' }, { status: 403 });
    }
    
    // 获取请求体数据
    const data = await request.json();
    
    // 验证必填字段
    if (!data.systemName) {
      return NextResponse.json({ message: '系统名称不能为空' }, { status: 400 });
    }
    
    // 过滤和验证设置字段
    const filteredSettings = {
      ...DEFAULT_SETTINGS,
      systemName: data.systemName,
      logoUrl: data.logoUrl || DEFAULT_SETTINGS.logoUrl,
      primaryColor: data.primaryColor || DEFAULT_SETTINGS.primaryColor,
      enableNotifications: Boolean(data.enableNotifications),
      defaultLanguage: ['zh-CN', 'en-US'].includes(data.defaultLanguage) 
        ? data.defaultLanguage 
        : DEFAULT_SETTINGS.defaultLanguage,
      dataRetentionDays: Number(data.dataRetentionDays) >= 30 && Number(data.dataRetentionDays) <= 3650 
        ? Number(data.dataRetentionDays) 
        : DEFAULT_SETTINGS.dataRetentionDays,
      maintenanceMode: Boolean(data.maintenanceMode),
      debugMode: Boolean(data.debugMode),
      copyright: data.copyright || DEFAULT_SETTINGS.copyright,
      companyName: data.companyName || '',
      icp: data.icp || '',
    };
    
    // 保存设置
    const result = saveSettings(filteredSettings);
    
    if (result) {
      return NextResponse.json({ 
        message: '系统设置已保存', 
        settings: filteredSettings 
      });
    } else {
      return NextResponse.json(
        { message: '保存系统设置失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('保存系统设置失败:', error);
    return NextResponse.json(
      { message: '保存系统设置失败', error: String(error) },
      { status: 500 }
    );
  }
} 