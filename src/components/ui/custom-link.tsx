'use client';

import Link from 'next/link';
import { LinkProps } from 'next/link';
import React from 'react';

// 扩展Link组件接口，默认禁用预加载
interface CustomLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
}

// 自定义Link组件，解决预加载和路由问题
export function CustomLink({ children, prefetch = false, ...props }: CustomLinkProps) {
  return (
    <Link prefetch={prefetch} {...props}>
      {children}
    </Link>
  );
} 