import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '客户管理系统',
  description: '一个现代化的客户管理系统',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 其他头部元素 */}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

