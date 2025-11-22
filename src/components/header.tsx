'use client';

import { UserNav } from '@/components/user-nav';
import { MainNav } from './main-nav';
import { Button } from './ui/button';
import Link from 'next/link';
import { Logo } from './icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu } from 'lucide-react';
import { AddTransactionDialog } from './add-transaction-dialog';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary px-4 text-primary-foreground backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          asChild
        >
          <Link href="/" aria-label="Home">
            <Logo className="size-6" />
          </Link>
        </Button>
        <div className="flex-col md:flex">
          <h2 className="font-headline text-lg font-semibold tracking-tight">
            مدير المعاملات
          </h2>
        </div>
      </div>

      <div className="hidden md:flex md:flex-1">
        <MainNav />
      </div>


       <div className="flex flex-1 items-center justify-end gap-4">
        <AddTransactionDialog />
        <UserNav />
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                    <span className="sr-only">فتح القائمة</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>القائمة</SheetTitle>
              </SheetHeader>
              <MainNav />
            </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
