
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
import { Badge } from '@/components/ui/badge';
import type { WakalahContract } from '@/lib/types';
import { format } from 'date-fns';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';

export default function WakalahPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collectionGroup(firestore, `wakalahContracts`), where('clientId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: wakalahContracts, isLoading } = useCollection<WakalahContract>(contractsQuery);

    const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: WakalahContract['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary">نشط</Badge>;
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            مكتمل
          </Badge>
        );
      case 'overdue':
        return <Badge variant="destructive">متأخر</Badge>;
      case 'archived':
        return <Badge variant="outline">مؤرشف</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          عقود الوكالة
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة عقود الوكالة الخاصة بك.
        </p>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>قائمة العقود</CardTitle>
          <CardDescription>
            جميع عقود الوكالة الحالية والسابقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>الوكيل</TableHead>
                 <TableHead>رسوم الوكالة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5}>جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && wakalahContracts?.length === 0 && <TableRow><TableCell colSpan={5}>لا توجد عقود.</TableCell></TableRow>}
              {wakalahContracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.clientName}</TableCell>
                  <TableCell>{contract.agentName}</TableCell>
                  <TableCell>{formatCurrency(contract.amount)}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell>
                    {format(new Date(contract.endDate), 'dd/MM/yyyy')}
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
