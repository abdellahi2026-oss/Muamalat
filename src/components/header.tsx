'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { MainNav } from './main-nav';
import { Button } from './ui/button';
import Link from 'next/link';
import { Logo } from './icons';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary px-4 text-primary-foreground backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hidden shrink-0 md:flex"
          asChild
        >
          <Link href="/" aria-label="Home">
            <Logo className="size-6" />
          </Link>
        </Button>
        <div className="hidden flex-col md:flex">
          <h2 className="font-headline text-lg font-semibold tracking-tight">
            مدير المعاملات
          </h2>
          <p className="text-sm text-primary-foreground/80">Muamalat Manager</p>
        </div>
      </div>

      <div className="hidden md:flex">
        <MainNav />
      </div>
      <div className="flex-1" />
      <UserNav />
    </header>
  );
}
