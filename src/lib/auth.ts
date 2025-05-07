import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import { compare } from 'bcryptjs';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      email: string;
      name: string | null;
      role: Role;
    };
  }
  interface User {
    id: string | number;
    email: string;
    name: string | null;
    role: Role;
  }
}

// 使用环境变量中的密钥
const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error("警告: NEXTAUTH_SECRET 未设置! 这会导致会话在服务器重启时失效。");
}

export const authOptions: NextAuthOptions = {
  secret, // 显式设置密钥
  debug: process.env.NODE_ENV === 'development', // 仅在开发环境开启调试
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error('用户不存在');
        }

        if (!user.isActive) {
          throw new Error('账号未激活，请联系管理员');
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('密码错误');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // 初始登录时，添加用户数据到token
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as Role;
        session.user.id = token.id as unknown as number;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // 错误页面也指向登录页，可以在登录页处理错误
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  jwt: {
    // 增加JWT安全配置
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30天，与session配置保持一致
  },
  // 确保cookie安全且支持跨站
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}; 