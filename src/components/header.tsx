'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, UserCircle, LogOut, Menu } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { signOut } from 'next-auth/react';

// 获取用户名称的首字母缩写
function getInitials(name?: string | null) {
  if (!name) return '用';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Link href="/dashboard" className="font-bold text-xl hidden md:block">客户管理系统</Link>
        </div>

        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              {session.user.name || session.user.email}
            </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user.name || '用户'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      角色: {session.user.role === 'ADMIN' ? '管理员' : 
                            session.user.role === 'SUPER_ADMIN' ? '超级管理员' :
                            session.user.role === 'PARTNER' ? '合作伙伴' : '用户'}
                    </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer w-full flex items-center">
                  <UserCircle className="mr-2 h-4 w-4" />
                  个人中心
                </Link>
              </DropdownMenuItem>
              {(session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') && (
                <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="cursor-pointer w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                      系统设置
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                  className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}