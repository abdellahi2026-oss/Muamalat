
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users as CustomersIcon,
  Home,
  Package,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';


export function MainNav() {
  const pathname = usePathname();
  const { user, firestore, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userData, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  const isAdmin = userData?.role === 'admin';

  if (isUserLoading || isUserDocLoading) {
    return null; // Or a loading skeleton
  }

  const navLinks = [
    { href: '/', label: 'لوحة التحكم', icon: Home, isActive: pathname === '/' },
    { href: '/clients', label: 'الزبائن', icon: CustomersIcon, isActive: pathname.startsWith('/clients') },
    { href: '/products', label: 'المنتجات', icon: Package, isActive: pathname.startsWith('/products') },
    { href: '/transactions', label: 'المعاملات', icon: FileText, isActive: pathname.startsWith('/transactions') },
    ...(isAdmin ? [{ href: '/users', label: 'المستخدمين', icon: 'Users' as any, isActive: pathname.startsWith('/users') }] : [])
  ];

  return (
    <>
      {/* Mobile Nav */}
      <nav className="mt-8 flex flex-col space-y-2 md:hidden">
         {navLinks.map(({ href, label, icon: Icon, isActive }) => (
            <Link
                key={label}
                href={href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive && 'bg-muted text-primary'
                )}
            >
                <Icon className="h-4 w-4" />
                {label}
            </Link>
         ))}
      </nav>

      {/* Desktop Nav */}
      <nav className="hidden items-center gap-6 text-sm font-medium md:flex ml-6">
        {navLinks.map(({ href, label, isActive }) => (
            <Link
                key={label}
                href={href}
                className={cn(
                    'transition-colors hover:text-primary-foreground/80',
                    isActive ? 'text-primary-foreground' : 'text-primary-foreground/60'
                )}
            >
                {label}
            </Link>
        ))}
      </nav>
    </>
  );
}
