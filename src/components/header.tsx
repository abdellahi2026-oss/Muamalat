
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
import { Menu, Search, Plus, ChevronDown, HandCoins } from 'lucide-react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { RegisterPaymentDialog } from './register-payment-dialog';
import { Input } from './ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [isTransactionOpen, setTransactionOpen] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/clients?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
        router.push(`/clients`);
    }
  };


  return (
    <>
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary px-4 text-primary-foreground backdrop-blur-sm sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2" aria-label="Home">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
        >
            <Logo className="size-6" />
        </Button>
        <div className="hidden flex-col md:flex">
          <h2 className="font-headline text-lg font-semibold tracking-tight">
            مدير المعاملات
          </h2>
        </div>
      </Link>

      <div className="hidden md:flex md:flex-1">
        <MainNav />
      </div>


       <div className="flex flex-1 items-center justify-end gap-2">
            <form onSubmit={handleSearch} className="hidden md:flex">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="بحث عن زبون..." 
                      className="w-full rounded-lg bg-background text-foreground pl-10 md:w-[200px] lg:w-[320px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </form>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                    <Plus className="me-2"/>
                    <span>إضافة</span>
                    <ChevronDown className="ms-2 size-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setTransactionOpen(true)}>
                    <Plus className="me-2"/>
                    معاملة جديدة
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPaymentOpen(true)}>
                    <HandCoins className="me-2"/>
                    تسجيل دفعة
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

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
               <div className="p-4">
                 <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="بحث عن زبون..." 
                            className="w-full rounded-lg bg-background text-foreground pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                  </form>
               </div>
            </SheetContent>
        </Sheet>
      </div>
    </header>
     <AddTransactionDialog isOpen={isTransactionOpen} setIsOpen={setTransactionOpen} />
     <RegisterPaymentDialog isOpen={isPaymentOpen} setIsOpen={setPaymentOpen} />
    </>
  );
}
