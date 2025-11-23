
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
import type { MusharakahContract } from '@/lib/types';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { TransactionActions } from '@/components/transaction-actions';


export default function MusharakahPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'musharakahContracts');
  }, [firestore, user?.uid]);

  const { data: musharakahContracts, isLoading } = useCollection<MusharakahContract>(contractsQuery);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: MusharakahContract['status']) => {
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
          عقود المشاركة
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة عقود المشاركة الخاصة بك.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة العقود</CardTitle>
          <CardDescription>
            جميع عقود المشاركة الحالية والسابقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المشروع</TableHead>
                <TableHead>إجمالي المساهمة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5}>جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && musharakahContracts?.length === 0 && <TableRow><TableCell colSpan={5}>لا توجد عقود.</TableCell></TableRow>}
              {musharakahContracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.clientName}</TableCell>
                  <TableCell>{formatCurrency(contract.amount)}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell>
                    {format(new Date(contract.endDate), 'dd/MM/yyyy')}
                  </TableCell>
                   <TableCell className="text-right">
                    <TransactionActions contract={contract} />
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
