import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// 允许的文件类型
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// 最大文件大小 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: '未选择文件' }, { status: 400 });
    }

    // 验证文件
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { message: '不支持的文件类型' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: '文件大小超过限制' },
          { status: 400 }
        );
      }
    }

    // 上传文件
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const urls = await Promise.all(
      files.map(async file => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 生成唯一文件名
        const fileName = `${uuidv4()}-${file.name}`;
        const filePath = join(uploadDir, fileName);

        // 写入文件
        await writeFile(filePath, buffer);

        // 返回文件URL
        return \`/uploads/\${fileName}\`;
      })
    );

    return NextResponse.json({ urls });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { message: '文件上传失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}