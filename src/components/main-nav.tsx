
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

export function MainNav() {
  const pathname = usePathname();
  const [contractsOpen, setContractsOpen] = React.useState(
    pathname.startsWith('/contracts')
  );

  const isActive = (path: string) => pathname === path;
  const isContractsActive = (type: string) => pathname === `/contracts/${type}`;

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
