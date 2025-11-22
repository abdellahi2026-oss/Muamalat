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
import { Menu, Search } from 'lucide-react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Input } from './ui/input';
import { useState } from 'react';

export function Header() {
  const [searchVisible, setSearchVisible] = useState(false);
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


       <div className="flex flex-1 items-center justify-end gap-2">
        <div className="relative flex-1 md:grow-0">
          <Button onClick={() => setSearchVisible(!searchVisible)} size="icon" variant="ghost" className="md:hidden">
            <Search className="h-5 w-5"/>
            <span className="sr-only">Search</span>
          </Button>
           <div className={`absolute left-0 top-full mt-2 w-full md:static md:w-auto md:block ${searchVisible ? 'block' : 'hidden'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث..." className="w-full rounded-lg bg-background text-foreground pl-10 md:w-[200px] lg:w-[320px]"/>
              </div>
           </div>
        </div>
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
