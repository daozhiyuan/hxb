'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileX, Plus, Search } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  type?: 'search' | 'empty' | 'error' | 'custom';
}

export function EmptyState({
  title,
  description,
  icon,
  className,
  action,
  type = 'empty'
}: EmptyStateProps) {
  // 根据类型设置默认值
  const defaultValues = {
    search: {
      title: '无搜索结果',
      description: '没有找到符合条件的数据，请尝试更改搜索条件',
      icon: <Search className="h-10 w-10 text-muted-foreground/50" />
    },
    empty: {
      title: '暂无数据',
      description: '当前没有任何数据可供显示',
      icon: <FileX className="h-10 w-10 text-muted-foreground/50" />
    },
    error: {
      title: '数据加载失败',
      description: '加载数据时发生错误，请稍后重试',
      icon: <FileX className="h-10 w-10 text-destructive/70" />
    },
    custom: {
      title: '',
      description: '',
      icon: null
    }
  };

  const defaultValue = defaultValues[type];
  
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="flex flex-col items-center gap-3 max-w-md">
        {icon || defaultValue.icon}
        {(title || defaultValue.title) && (
          <h3 className="text-lg font-semibold">{title || defaultValue.title}</h3>
        )}
        {(description || defaultValue.description) && (
          <p className="text-sm text-muted-foreground">
            {description || defaultValue.description}
          </p>
        )}
        {action && (
          <Button 
            onClick={action.onClick} 
            className="mt-4"
            size="sm"
          >
            {action.icon || <Plus className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
} 