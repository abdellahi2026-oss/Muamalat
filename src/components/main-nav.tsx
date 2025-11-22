
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();
  
  const isContractsActive = (path: string) => pathname.startsWith(path);
  
  const [contractsOpen, setContractsOpen] = React.useState(
    pathname.startsWith('/contracts')
  );
  
  const isContractsActiveMobile = (type: string) => pathname === `/contracts/${type}`;


  return (
    <nav className="mt-8 flex flex-col space-y-2">
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
           pathname === '/commodities' && 'bg-muted text-primary'
        )}
      >
        <CreditCard className="h-4 w-4" />
        بطاقات السلع
      </Link>
    </nav>
  );
}
