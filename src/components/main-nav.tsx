
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
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

function NavLinks() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const isContractsActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/"
        className={cn(
          'text-sm font-medium transition-colors hover:text-primary-foreground/80',
          isActive('/') ? 'text-primary-foreground' : 'text-primary-foreground/60'
        )}
      >
        لوحة التحكم
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center text-sm font-medium transition-colors hover:text-primary-foreground/80',
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
      <Link
        href="/settings"
        className={cn(
          'text-sm font-medium transition-colors hover:text-primary-foreground/80',
          isActive('/settings')
            ? 'text-primary-foreground'
            : 'text-primary-foreground/60'
        )}
      >
        الإعدادات
      </Link>
    </nav>
  );
}


export function MainNav() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const [contractsOpen, setContractsOpen] = React.useState(
    pathname.startsWith('/contracts')
  );

  const isActive = (path: string) => pathname === path;
  const isContractsActive = (type: string) => pathname === `/contracts/${type}`;

  if (!isMobile) {
    return <NavLinks />;
  }

  return (
    <>
      <SidebarHeader className="my-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/" aria-label="Home">
              <Logo className="size-6 text-primary" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h2 className="font-headline text-lg font-semibold tracking-tight">
              مدير المعاملات
            </h2>
            <p className="text-sm text-muted-foreground">Muamalat Manager</p>
          </div>
        </div>
      </SidebarHeader>

      <div className="flex-1 overflow-y-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/')}
              tooltip="لوحة التحكم"
            >
              <Link href="/">
                <LayoutDashboard />
                <span>لوحة التحكم</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Collapsible open={contractsOpen} onOpenChange={setContractsOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <FileText />
                  <span>العقود</span>
                  <ChevronDown
                    className={cn(
                      'ms-auto size-4 transition-transform',
                      contractsOpen && 'rotate-180'
                    )}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>

            <CollapsibleContent asChild>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isContractsActive('murabaha')}
                  >
                    <Link href="/contracts/murabaha">المرابحة</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isContractsActive('mudarabah')}
                  >
                    <Link href="/contracts/mudarabah">المضاربة</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isContractsActive('musharakah')}
                  >
                    <Link href="/contracts/musharakah">المشاركة</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isContractsActive('wakalah')}
                  >
                    <Link href="/contracts/wakalah">الوكالة</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/commodities')}
              tooltip="بطاقات السلع"
            >
              <Link href="/commodities">
                <CreditCard />
                <span>بطاقات السلع</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <SidebarFooter>
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="الإعدادات">
              <Link href="/settings">
                <Settings />
                <span>الإعدادات</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
