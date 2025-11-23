
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
import { collection } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { TransactionActions } from '@/components/transaction-actions';

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
    default:
      return 'عقد';
  }
};

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
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const renderClientOrProject = (contract: AnyContract) => {
  let details = contract.clientName;
  if (contract.type === 'musharakah') {
      const partners = (contract as MusharakahContract).partnerIds.slice(0, 2).join(', ');
      details += ` (شركاء: ${partners}...)`;
  }
  if (contract.type === 'wakalah') {
      details += ` (وكيل: ${(contract as WakalahContract).agentName})`;
  }
  return details;
}


export default function CurrentTransactionsPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q');

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
    return collection(firestore, 'clients', user.uid, 'musharakahContracts');
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

  const filteredContracts = useMemo(() => {
    if (!allContracts) return [];
    if (!searchQuery) return allContracts;

    const lowercasedQuery = searchQuery.toLowerCase();
    
    return allContracts.filter(contract => {
        const clientNameMatch = contract.clientName?.toLowerCase().includes(lowercasedQuery);
        const typeMatch = getContractTypeArabic(contract.type).toLowerCase().includes(lowercasedQuery);
        let partnerMatch = false;
        let agentMatch = false;

        if (contract.type === 'musharakah') {
            const musharakah = contract as MusharakahContract;
            partnerMatch = musharakah.partnerIds.some(p => p.toLowerCase().includes(lowercasedQuery));
        }

        if (contract.type === 'wakalah') {
            const wakalah = contract as WakalahContract;
            agentMatch = wakalah.agentName?.toLowerCase().includes(lowercasedQuery);
        }

        return clientNameMatch || typeMatch || partnerMatch || agentMatch;
    });
  }, [allContracts, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          المعاملات
        </h1>
        <p className="text-muted-foreground">
          عرض جميع معاملاتك الحالية والسابقة.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المعاملات</CardTitle>
          <CardDescription>
            {searchQuery ? `نتائج البحث عن "${searchQuery}"` : 'جميع المعاملات التي قمت بها.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل / المشروع</TableHead>
                <TableHead>نوع العقد</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                 <TableHead>تاريخ الانتهاء</TableHead>
                 <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center">جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && filteredContracts.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        {searchQuery ? 'لم يتم العثور على نتائج.' : 'لا توجد معاملات لعرضها.'}
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{renderClientOrProject(contract)}</TableCell>
                  <TableCell>{getContractTypeArabic(contract.type)}</TableCell>
                  <TableCell>{contract.amount ? formatCurrency(contract.amount) : 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell>
                    {contract.endDate ? format(new Date(contract.endDate), 'dd/MM/yyyy') : 'N/A'}
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
