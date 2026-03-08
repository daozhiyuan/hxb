'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { 
  UsersIcon, 
  HomeIcon, 
  UserCircleIcon, 
  FileTextIcon, 
  SettingsIcon,
  BarChart3Icon,
  FolderIcon
} from 'lucide-react';

export function MainNav() {
  const pathname = usePathname() ?? '';
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isPartner = userRole === 'PARTNER';
  
  const navItems = [
    {
      title: '仪表盘',
      href: '/dashboard',
      icon: <HomeIcon className="mr-2 h-4 w-4" />,
      show: true,
    },
    {
      title: '客户管理',
      href: '/crm/customers',
      icon: <UsersIcon className="mr-2 h-4 w-4" />,
      show: true,
    },
    {
      title: '申诉管理',
      href: '/appeals',
      icon: <FileTextIcon className="mr-2 h-4 w-4" />,
      show: true,
    },
    {
      title: '报表分析',
      href: '/crm/reports',
      icon: <BarChart3Icon className="mr-2 h-4 w-4" />,
      show: isAdmin || isPartner,
    },
    {
      title: '文件管理',
      href: '/crm/files',
      icon: <FolderIcon className="mr-2 h-4 w-4" />,
      show: isAdmin || isPartner,
    },
    {
      title: '用户管理',
      href: '/admin/users',
      icon: <UsersIcon className="mr-2 h-4 w-4" />,
      show: isAdmin,
    },
    {
      title: '系统设置',
      href: '/admin/settings',
      icon: <SettingsIcon className="mr-2 h-4 w-4" />,
      show: isAdmin,
    },
    {
      title: '个人中心',
      href: '/profile',
      icon: <UserCircleIcon className="mr-2 h-4 w-4" />,
      show: true,
    },
  ];

  return (
    <nav className="space-y-1">
      {navItems
        .filter(item => item.show)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors',
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground'
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
    </nav>
  );
} 