import '@/app/globals.css';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

export default function MyApp({ Component, pageProps }: AppProps) {
  const { session, ...props } = pageProps;

  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Component {...props} />
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
} 