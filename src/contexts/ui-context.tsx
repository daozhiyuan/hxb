'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface UIContextType {
  isLoading: boolean;
  loadingText: string;
  startLoading: (text?: string) => void;
  stopLoading: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('加载中...');

  const startLoading = (text = '加载中...') => {
    setLoadingText(text);
    setIsLoading(true);
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  return (
    <UIContext.Provider value={{ isLoading, loadingText, startLoading, stopLoading }}>
      {children}
      {isLoading && <LoadingSpinner fullScreen text={loadingText} />}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
} 