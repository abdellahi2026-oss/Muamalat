
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
import type { MudarabahContract } from '@/lib/types';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function MudarabahPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'mudarabahContracts');
  }, [firestore, user?.uid]);

  const { data: mudarabahContracts, isLoading } = useCollection<MudarabahContract>(contractsQuery);

    const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: MudarabahContract['status']) => {
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
          عقود المضاربة
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة عقود المضاربة الخاصة بك.
        </p>
      </div>
        <Card>
        <CardHeader>
          <CardTitle>قائمة العقود</CardTitle>
          <CardDescription>
            جميع عقود المضاربة الحالية والسابقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>رأس المال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4}>جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && mudarabahContracts?.length === 0 && <TableRow><TableCell colSpan={4}>لا توجد عقود.</TableCell></TableRow>}
              {mudarabahContracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.clientName}</TableCell>
                  <TableCell>{formatCurrency(contract.capital)}</TableCell>
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
