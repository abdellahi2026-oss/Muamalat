
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
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function CurrentTransactionsPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();

  const murabahaQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'murabahaContracts');
  }, [firestore, user?.uid]);

  const mudarabahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'mudarabahContracts');
  }, [firestore, user?.uid]);
  
  const musharakahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'musharakahContracts'), where('partnerIds', 'array-contains', user.uid));
  }, [firestore, user?.uid]);

  const wakalahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'wakalahContracts');
  }, [firestore, user?.uid]);

  const { data: murabahaContracts, isLoading: loadingMurabaha } = useCollection<MurabahaContract>(murabahaQuery);
  const { data: mudarabahContracts, isLoading: loadingMudarabah } = useCollection<MudarabahContract>(mudarabahQuery);
  const { data: musharakahContracts, isLoading: loadingMusharakah } = useCollection<MusharakahContract>(musharakahQuery);
  const { data: wakalahContracts, isLoading: loadingWakalah } = useCollection<WakalahContract>(wakalahQuery);

  const allContracts = useMemo(() => {
    const contracts: AnyContract[] = [];
    if (murabahaContracts) contracts.push(...murabahaContracts);
    if (mudarabahContracts) contracts.push(...mudarabahContracts);
    if (musharakahContracts) contracts.push(...musharakahContracts);
    if (wakalahContracts) contracts.push(...wakalahContracts);
    return contracts;
  }, [murabahaContracts, mudarabahContracts, musharakahContracts, wakalahContracts]);

  const isLoading = loadingMurabaha || loadingMudarabah || loadingMusharakah || loadingWakalah;


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
