
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Header } from '@/components/header';
import { Logo } from './icons';
import Link from 'next/link';
import { Button } from './ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return; // Wait for user status to be determined

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      // If user is not logged in and not on the login page, redirect to login
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // Don't render the main layout on the login page or while loading
  if (pathname === '/login' || loading) {
    return <>{children}</>;
  }
  
  // While redirecting, show a blank page or a loader
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar side="right" collapsible="icon">
        <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/" aria-label="Home">
                <Logo className="size-6 text-primary" />
              </Link>
            </Button>
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold tracking-tight">
                مدير المعاملات
              </h2>
              <p className="text-sm text-muted-foreground">Muamalat Manager</p>
            </div>
          </div>
        <MainNav />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
