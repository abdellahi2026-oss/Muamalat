
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { Loader2, User } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('q');

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'clients');
  }, [firestore, user?.uid]);

  const { data: clients, isLoading, error } = useCollection<Client>(clientsQuery);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery) return clients;

    return clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)
    );
  }, [clients, searchQuery]);
  
  const sortedClients = useMemo(() => {
      return filteredClients.sort((a,b) => b.totalDue - a.totalDue);
  }, [filteredClients])

  const handleRowClick = (clientId: string) => {
      router.push(`/clients/${clientId}`);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          الزبائن
        </h1>
        <p className="text-muted-foreground">
          مراجعة سريعة للمعاملات المفتوحة وإجمالي المستحقات لكل زبون.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة الزبائن</CardTitle>
           <CardDescription>
            {searchQuery 
                ? `نتائج البحث عن "${searchQuery}"` 
                : 'انقر على زبون لعرض تفاصيل معاملاته.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الزبون</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="text-left">إجمالي الرصيد المستحق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              )}
               {!isLoading && error && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center text-destructive">
                      حدث خطأ أثناء جلب البيانات.
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    {searchQuery ? 'لم يتم العثور على زبائن.' : 'لا يوجد زبائن لعرضهم. أضف معاملة جديدة للبدء.'}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedClients.map((client) => (
                <TableRow key={client.id} onClick={() => handleRowClick(client.id)} className="cursor-pointer">
                  <TableCell className="font-medium flex items-center gap-2">
                    <User className="size-4 text-muted-foreground"/>
                    {client.name}
                  </TableCell>
                  <TableCell className='text-muted-foreground' dir="ltr">{client.phone || 'غير متوفر'}</TableCell>
                  <TableCell className="text-left font-semibold text-red-600">
                    {formatCurrency(client.totalDue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
