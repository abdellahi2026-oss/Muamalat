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
import type { User as FirebaseUser } from 'firebase/auth';
import { CreditCard, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/firebase';

type UserNavProps = {
  user: FirebaseUser | null;
  loading: boolean;
};

export function UserNav({ user, loading }: UserNavProps) {
  const auth = useAuth();
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">تسجيل الدخول</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon className="me-2 h-4 w-4" />
            <span>الملف الشخصي</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="me-2 h-4 w-4" />
            <span>الفوترة</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="me-2 h-4 w-4" />
            <span>الإعدادات</span>
          </DropdownMenuItem>
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
