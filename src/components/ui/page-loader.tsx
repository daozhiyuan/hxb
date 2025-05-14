'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PageLoader({
  title = '页面加载中',
  description = '请稍候，正在加载数据...',
  className,
  size = 'md'
}: PageLoaderProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[50vh] p-6', className)}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        {title && <h2 className="text-xl font-semibold">{title}</h2>}
        {description && <p className="text-sm text-muted-foreground text-center max-w-md">{description}</p>}
      </div>
    </div>
  );
} 