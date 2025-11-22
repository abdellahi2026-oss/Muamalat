
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
import type { AnyContract, MurabahaContract, MudarabahContract, MusharakahContract, WakalahContract } from '@/lib/types';
import { format } from 'date-fns';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';

export default function CurrentTransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Use a collection group query to get all contracts for the user
    return query(
      collectionGroup(firestore, 'murabahaContracts'),
      where('clientId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: allContracts, isLoading } = useCollection<AnyContract>(contractsQuery);

  const currentTransactions = useMemo(() => {
    if (!allContracts) return [];
    return allContracts.filter(
      (c) => c.status === 'active' || c.status === 'overdue'
    );
  }, [allContracts]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: AnyContract['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant='secondary'>نشط</Badge>;
      case 'overdue':
        return <Badge variant="destructive">متأخر</Badge>;
      case 'completed':
         return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            مكتمل
          </Badge>
        );
      case 'archived':
        return <Badge variant="outline">مؤرشف</Badge>;
    }
  };
  
    const getContractTypeArabic = (type: AnyContract['type']) => {
    switch (type) {
      case 'murabaha':
        return 'مرابحة';
      case 'mudarabah':
        return 'مضاربة';
      case 'musharakah':
        return 'مشاركة';
      case 'wakalah':
        return 'وكالة';
    }
  };

  const getContractAmount = (contract: AnyContract) => {
    switch (contract.type) {
      case 'murabaha':
        return contract.sellingPrice * contract.units;
      case 'mudarabah':
        return contract.capital;
      case 'musharakah':
        return contract.amount;
      case 'wakalah':
        return contract.amount;
      default:
        return 0;
    }
  }


  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          المعاملات الحالية
        </h1>
        <p className="text-muted-foreground">
          عرض جميع المعاملات النشطة والمتأخرة.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المعاملات</CardTitle>
          <CardDescription>
            جميع المعاملات التي تتطلب متابعة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>نوع العقد</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                 <TableHead>تاريخ الانتهاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5}>جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && currentTransactions.length === 0 && <TableRow><TableCell colSpan={5}>لا توجد معاملات حالية.</TableCell></TableRow>}
              {!isLoading && currentTransactions.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.clientName}</TableCell>
                  <TableCell>{getContractTypeArabic(contract.type)}</TableCell>
                  <TableCell>{formatCurrency(getContractAmount(contract))}</TableCell>
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
