
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, UserCircle, Settings, Users as AdminUsersIcon, Package, User } from 'lucide-react';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useAuth, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';


export function UserNav() {
  const auth = useAuth();
  const router = useRouter();
  const { user, firestore, isUserLoading } = useFirebase();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserType>(userDocRef);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const isLoading = isUserLoading || isUserDocLoading;

  if (isLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">تسجيل الدخول</Link>
      </Button>
    );
  }

  const displayName = userData?.name || user.displayName || user.email;
  const displayEmail = user.email;
  const isAdmin = userData?.role === 'admin';


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <UserCircle className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
            <DropdownMenuItem asChild>
                <Link href="/clients">
                    <User className="me-2 h-4 w-4" />
                    <span>الزبائن</span>
                </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
                <Link href="/products">
                    <Package className="me-2 h-4 w-4" />
                    <span>المنتجات</span>
                </Link>
            </DropdownMenuItem>
           <DropdownMenuItem asChild>
                <Link href="/settings">
                    <Settings className="me-2 h-4 w-4" />
                    <span>الإعدادات</span>
                </Link>
            </DropdownMenuItem>
             {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link href="/users">
                        <AdminUsersIcon className="me-2 h-4 w-4" />
                        <span>إدارة المستخدمين</span>
                    </Link>
                </DropdownMenuItem>
            )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="me-2 h-4 w-4" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
