
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useEffect } from 'react';
import { Header } from '@/components/header';

function Footer() {
    return (
        <footer className="bg-primary text-primary-foreground py-4 mt-auto">
            <div className="container mx-auto text-center text-sm">
                <p>&copy; 2024 - créé Par Abdellahi EMS</p>
            </div>
        </footer>
    );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (isUserLoading) {
      return; // Do nothing while loading
    }

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      router.push('/login');
    }

    if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, isUserLoading, pathname, router]);

  // While loading, or if no user and not on login page (during redirect), render nothing.
  if (isUserLoading || (!user && pathname !== '/login')) {
    return null;
  }
  
  // If on login page, just render the login page itself without the main layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If we have a user and are not on the login page, render the full app layout
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}
