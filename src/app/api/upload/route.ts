import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 导入API配置
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 允许的文件类型
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/rtf',
  'application/zip',
  'application/x-rar-compressed'
];

// 最大文件大小（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 处理文件上传请求
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('未授权访问: 用户未登录');
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      console.error('未提供文件');
      return NextResponse.json({ message: '未提供文件' }, { status: 400 });
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      if (!existsSync(uploadDir)) {
        console.log('创建上传目录:', uploadDir);
        await mkdir(uploadDir, { recursive: true });
      }
    } catch (error: any) {
      console.error('创建上传目录失败:', {
        error: error.message,
        code: error.code,
        path: uploadDir
      });
      return NextResponse.json(
        { message: '无法创建上传目录', details: error.message },
        { status: 500 }
      );
    }

    const uploadedUrls = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof Blob)) {
        console.error('无效的文件对象:', file);
        errors.push('无效的文件对象');
        continue;
      }

      // 验证文件类型
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        console.error(`不支持的文件类型: ${file.type}`);
        errors.push(`不支持的文件类型: ${file.type}`);
        continue;
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        console.error(`文件大小超过限制: ${file.size} bytes`);
        errors.push(`文件大小超过限制（最大5MB）`);
        continue;
      }

      try {
        // 生成唯一文件名
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;
        const filePath = join(uploadDir, uniqueFileName);

        console.log('保存文件:', {
          originalName: file.name,
          newName: uniqueFileName,
          size: file.size,
          type: file.type
        });

        // 将文件写入磁盘
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // 生成访问URL
        const fileUrl = `/uploads/${uniqueFileName}`;
        uploadedUrls.push(fileUrl);
        console.log(`文件上传成功: ${fileUrl}`);
      } catch (error: any) {
        console.error('保存文件失败:', {
          error: error.message,
          code: error.code,
          fileName: file.name
        });
        errors.push(`保存文件失败: ${file.name}`);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { 
          message: '没有文件被成功上传',
          errors: errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      urls: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('文件上传失败:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        message: '文件上传失败',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}