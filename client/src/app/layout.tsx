import type { Metadata } from 'next';

import { ReduxProvider } from '@/app/provider';

import MainLayout from '@/components/layout';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Twilsta',
  description: 'A modern Twilsta built with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReduxProvider>
          <MainLayout>{children}</MainLayout>
        </ReduxProvider>
      </body>
    </html>
  );
}
