'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 在开发环境记录错误详情
    if (process.env.NODE_ENV === 'development') {
      console.error('组件错误:', error);
      console.error('组件堆栈:', errorInfo.componentStack);
    }
  }

  handleReset = (): void => {
    const { onReset } = this.props;
    
    // 调用自定义重置函数
    if (onReset) {
      onReset();
    }
    
    // 重置错误状态
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义回退UI，则使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">出现错误</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || '组件渲染时发生错误，请尝试刷新页面'}
            </p>
            <Button 
              onClick={this.handleReset}
              className="mt-2"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
} 