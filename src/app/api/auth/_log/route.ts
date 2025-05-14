import { NextResponse } from 'next/server';

// NextAuth客户端日志API
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 在开发环境打印错误，在生产环境忽略
    if (process.env.NODE_ENV === 'development') {
      console.log('NextAuth客户端日志:', data);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
} 