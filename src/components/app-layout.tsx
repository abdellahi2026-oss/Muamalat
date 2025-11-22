'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useEffect } from 'react';
import { Header } from '@/components/header';

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
    <>
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </>
  );
}
