'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class" // Apply theme class to <html> tag
        defaultTheme="system" // Default to system preference
        enableSystem // Enable system preference detection
        disableTransitionOnChange // Optional: disable theme change animations
        {...props}
      >
        {children}
        <Toaster /> {/* Add Toaster here inside providers */}
      </NextThemesProvider>
    </SessionProvider>
  );
}
