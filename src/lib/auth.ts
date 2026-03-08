import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import { compare } from 'bcryptjs';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { Role } from '@prisma/client';

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
  debug: process.env.NODE_ENV === 'development', // 在开发环境中启用调试
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[Auth] 尝试认证用户:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] 认证失败: 缺少邮箱或密码');
          throw new Error('请输入邮箱和密码');
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user) {
            console.error('[Auth] 认证失败: 用户不存在', credentials.email);
            throw new Error('用户不存在');
          }

          console.log('[Auth] 用户存在, 检查状态:', user.email, 'isActive:', user.isActive);

          if (!user.isActive) {
            console.error('[Auth] 认证失败: 账号未激活', user.email);
            throw new Error('账号未激活，请联系管理员');
          }

          // 确保密码比较正确执行
          const isValid = await compare(credentials.password, user.passwordHash);

          if (!isValid) {
            console.error('[Auth] 认证失败: 密码错误', user.email);
            throw new Error('密码错误');
          }

          console.log('[Auth] 认证成功:', user.email, 'role:', user.role);
          
          // 返回用户信息，确保ID是字符串
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('[Auth] 认证过程中发生错误:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('[Auth Redirect Callback] Original URL:', url);
      console.log('[Auth Redirect Callback] Base URL:', baseUrl);

      let decodedUrl = url;
      try {
        // 尝试解码，以处理像 '%2Fdashboard' 这样的输入
        decodedUrl = decodeURIComponent(url);
      } catch (e) {
        console.warn('[Auth Redirect Callback] Failed to decode URL component:', url, e);
        // 如果解码失败（例如url不是有效的编码字符串），则按原样使用url
      }
      console.log('[Auth Redirect Callback] Decoded URL (if applicable):', decodedUrl);

      // 如果解码后的 url 是以 '/' 开头的相对路径
      if (decodedUrl.startsWith('/')) {
        const finalUrl = `${baseUrl}${decodedUrl}`;
        console.log('[Auth Redirect Callback] Decoded URL is relative, returning:', finalUrl);
        return finalUrl;
      }
      
      // 检查原始的 url (在解码尝试之前) 是否是绝对URL且与baseUrl同源
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === new URL(baseUrl).origin) {
          console.log('[Auth Redirect Callback] Original URL is absolute and matches baseUrl origin, returning:', url);
          return url;
        }
      } catch (e) {
        // url 不是一个有效的绝对URL，继续检查解码后的URL
      }

      // 如果解码后的 url (decodedUrl) 也是一个有效的绝对URL并且与baseUrl同源
      // 这种情况可能在 url 本身就是 'https://...' 但包含了需要解码的查询参数时发生
      try {
        const parsedDecodedUrl = new URL(decodedUrl);
        if (parsedDecodedUrl.origin === new URL(baseUrl).origin) {
          console.log('[Auth Redirect Callback] Decoded URL is absolute and matches baseUrl origin, returning:', decodedUrl);
          return decodedUrl;
        }
      } catch (e) {
        // decodedUrl 也不是一个有效的绝对URL
      }

      console.log('[Auth Redirect Callback] URL is external or unexpected, or became invalid after decode. Defaulting to baseUrl:', baseUrl);
      return baseUrl; // 默认回到 baseUrl 或登录页，作为安全回退
    },
    async jwt({ token, user, account }) {
      // 初始登录时，添加用户数据到token
      if (user) {
        console.log('[Auth JWT] 生成JWT, 用户:', user.email);
        token.role = (user as any).role;
        token.id = Number(user.id); // 确保id始终是数字类型
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log('[Auth Session] 生成会话, 用户:', token.email);
        session.user.role = token.role as Role;
        // 确保ID是有效的数字并进行类型转换
        if (token.id !== undefined && token.id !== null) {
          session.user.id = Number(token.id);
        }
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
        sameSite: "none",
        path: "/",
        secure: true
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true
      },
    },
  },
}; 