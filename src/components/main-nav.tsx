
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  LayoutDashboard,
  CreditCard,
  Settings,
  ChevronDown,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';


export function MainNav() {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const isActive = (path: string) => pathname === path;
  const isContractsActive = (path: string) => pathname.startsWith(path);
  
  const [contractsOpen, setContractsOpen] = React.useState(
    pathname.startsWith('/contracts')
  );
  
  const isContractsActiveMobile = (type: string) => pathname === `/contracts/${type}`;


  if (isDesktop) {
    return (
      <nav className="flex items-center space-x-4 lg:space-x-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center text-sm font-medium transition-colors hover:text-primary-foreground/80 lg:ml-6',
            isContractsActive('/contracts')
              ? 'text-primary-foreground'
              : 'text-primary-foreground/60'
          )}
        >
          العقود
          <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <Link href="/contracts/murabaha">المرابحة</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/contracts/mudarabah">المضاربة</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/contracts/musharakah">المشاركة</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/contracts/wakalah">الوكالة</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href="/commodities"
        className={cn(
          'text-sm font-medium transition-colors hover:text-primary-foreground/80',
          isActive('/commodities')
            ? 'text-primary-foreground'
            : 'text-primary-foreground/60'
        )}
      >
        بطاقات السلع
      </Link>
    </nav>
    );
  }


  return (
    <nav className="mt-8 flex flex-col space-y-2">
      <Link
        href="/"
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
           isActive('/') && 'bg-muted text-primary'
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        لوحة التحكم
      </Link>
       <Collapsible open={contractsOpen} onOpenChange={setContractsOpen} className='w-full'>
          <CollapsibleTrigger asChild>
            <button
               className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                isContractsActive('/contracts') && 'text-primary'
              )}
            >
              <FileText className="h-4 w-4" />
              <span>العقود</span>
              <ChevronDown
                className={cn(
                  'ms-auto size-4 transition-transform',
                  contractsOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
            <Link
                href="/contracts/murabaha"
                className={cn('flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-muted-foreground transition-all hover:text-primary', isContractsActiveMobile('murabaha') && 'bg-muted text-primary')}
            >
                المرابحة
            </Link>
             <Link
                href="/contracts/mudarabah"
                className={cn('flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-muted-foreground transition-all hover:text-primary', isContractsActiveMobile('mudarabah') && 'bg-muted text-primary')}
            >
                المضاربة
            </Link>
             <Link
                href="/contracts/musharakah"
                className={cn('flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-muted-foreground transition-all hover:text-primary', isContractsActiveMobile('musharakah') && 'bg-muted text-primary')}
            >
                المشاركة
            </Link>
             <Link
                href="/contracts/wakalah"
                className={cn('flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-muted-foreground transition-all hover:text-primary', isContractsActiveMobile('wakalah') && 'bg-muted text-primary')}
            >
                الوكالة
            </Link>
        </CollapsibleContent>
      </Collapsible>

      <Link
        href="/commodities"
         className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
           isActive('/commodities') && 'bg-muted text-primary'
        )}
      >
        <CreditCard className="h-4 w-4" />
        بطاقات السلع
      </Link>
      <Link
        href="/settings"
         className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
           isActive('/settings') && 'bg-muted text-primary'
        )}
      >
        <Settings className="h-4 w-4" />
        الإعدادات
      </Link>
    </nav>
  );
}
