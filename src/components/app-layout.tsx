
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
    // Don't do anything until loading is false
    if (loading) return;

    const isAuthPage = pathname === '/login';

    // If no user and not on an auth page, redirect to login
    if (!user && !isAuthPage) {
      router.push('/login');
    }

    // If user is logged in and tries to access login page, redirect to home
    if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  // While loading authentication state, show nothing to prevent premature rendering of children
  if (loading) {
    return null; 
  }
  
  // If we are on the login page, just render the children (the login page itself)
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // If not loading and no user, we are in the process of redirecting, so show nothing.
  if (!user) {
    return null;
  }

  // If we have a user and are not on the login page, render the full app layout
  return (
    <>
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </>
  );
}
