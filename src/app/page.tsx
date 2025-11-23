
'use client';

import { useMemo, useState } from 'react';
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Users,
} from 'lucide-react';
import type { AnyContract, MurabahaContract, MudarabahContract, MusharakahContract, WakalahContract } from '@/lib/types';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { subDays, addDays } from 'date-fns';
import Link from 'next/link';


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useFirebase();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
    });


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
        
        if (!dateRange?.from) return contracts;
        
        const fromDate = dateRange.from;
        const toDate = dateRange.to || new Date(); // Default to today if 'to' is not set

        return contracts.filter(contract => {
            const contractStartDate = new Date(contract.startDate);
            return contractStartDate >= fromDate && contractStartDate <= toDate;
        });

    }, [murabahaContracts, mudarabahContracts, musharakahContracts, wakalahContracts, dateRange]);
    
    // We need all contracts for the "attention" section, not just the ones in the date range.
    const allContractsUnfiltered = useMemo(() => {
        const contracts: AnyContract[] = [];
        if (murabahaContracts) contracts.push(...murabahaContracts);
        if (mudarabahContracts) contracts.push(...mudarabahContracts);
        if (musharakahContracts) contracts.push(...musharakahContracts);
        if (wakalahContracts) contracts.push(...wakalahContracts);
        return contracts;
    }, [murabahaContracts, mudarabahContracts, musharakahContracts, wakalahContracts]);


    const isLoading = loadingMurabaha || loadingMudarabah || loadingMusharakah || loadingWakalah;


  const activeContracts = allContracts.filter(
    (c) => c.status === 'active'
  ).length;

  const totalContractValue = allContracts.reduce((sum, c) => sum + (c.amount || 0), 0);

 const expectedProfit = useMemo(() => {
    // We only calculate profit from murabaha contracts created within the date range.
    // The `allContracts` memo already filters by date range, so we use that.
    return allContracts
      .filter(c => c.type === 'murabaha' && c.status === 'active')
      .reduce((sum, c) => {
        const contract = c as MurabahaContract;
        const profitPerUnit = (contract.sellingPrice || 0) - (contract.purchasePrice || 0);
        const totalProfit = profitPerUnit * (contract.units || 0);
        return sum + totalProfit;
      }, 0);
  }, [allContracts]);
  
  const realizedProfit = useMemo(() => {
    // Calculate profit from *completed* murabaha contracts.
    return allContracts
      .filter(c => c.type === 'murabaha' && c.status === 'completed')
      .reduce((sum, c) => {
        const contract = c as MurabahaContract;
        const profitPerUnit = (contract.sellingPrice || 0) - (contract.purchasePrice || 0);
        const totalProfit = profitPerUnit * (contract.units || 0);
        return sum + totalProfit;
      }, 0);
  }, [allContracts]);


  const attentionContracts = useMemo(() => {
    const today = new Date();
    const oneWeekFromNow = addDays(today, 7);

    return allContractsUnfiltered
        .filter(c => {
            if (c.status === 'completed') return false;
            const endDate = new Date(c.endDate);
            const isOverdue = c.status === 'overdue';
            const isEndingSoon = endDate >= today && endDate <= oneWeekFromNow;
            return isOverdue || isEndingSoon;
        })
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .slice(0, 5);
  }, [allContractsUnfiltered]);

  const contractTypes = allContracts.reduce((acc, contract) => {
    acc[contract.type] = (acc[contract.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { type: 'المرابحة', count: contractTypes['murabaha'] || 0, fill: 'var(--color-murabaha)' },
    { type: 'المضاربة', count: contractTypes['mudarabah'] || 0, fill: 'var(--color-mudarabah)' },
    { type: 'المشاركة', count: contractTypes['musharakah'] || 0, fill: 'var(--color-musharakah)' },
    { type: 'الوكالة', count: contractTypes['wakalah'] || 0, fill: 'var(--color-wakalah)' },
  ];
  
  const chartConfig = {
    count: {
      label: "العدد",
    },
    murabaha: {
      label: "المرابحة",
      color: "hsl(var(--chart-1))",
    },
    mudarabah: {
      label: "المضاربة",
      color: "hsl(var(--chart-2))",
    },
    musharakah: {
      label: "المشاركة",
      color: "hsl(var(--chart-3))",
    },
    wakalah: {
      label: "الوكالة",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: AnyContract['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary">نشط</Badge>;
      case 'completed':
        return <Badge variant="default" className='bg-green-600 hover:bg-green-700'>مكتمل</Badge>;
      case 'overdue':
        return <Badge variant="destructive">متأخر</Badge>;
      case 'archived':
        return <Badge variant="outline">مؤرشف</Badge>;
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground">
            نظرة عامة على معاملاتك وعقودك المالية.
          </p>
        </div>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/commodities">
            <Card className='hover:bg-muted/50 transition-colors'>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي قيمة العقود</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(totalContractValue)}</div>
                <p className="text-xs text-muted-foreground">
                في الفترة المحددة
                </p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/commodities?status=active">
            <Card className='hover:bg-muted/50 transition-colors'>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : `+${activeContracts}`}</div>
                <p className="text-xs text-muted-foreground">
                من العقود التي بدأت في الفترة المحددة
                </p>
            </CardContent>
            </Card>
        </Link>
         <Link href="/commodities">
            <Card className='hover:bg-muted/50 transition-colors'>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الربح المتوقع</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(expectedProfit)}</div>
                <p className="text-xs text-muted-foreground">
                من عقود المرابحة النشطة في الفترة
                </p>
            </CardContent>
            </Card>
         </Link>
        <Link href="/commodities?status=completed">
            <Card className='hover:bg-muted/50 transition-colors'>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الأرباح المحققة</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(realizedProfit)}</div>
                <p className="text-xs text-muted-foreground">
                من عقود المرابحة المكتملة في الفترة
                </p>
            </CardContent>
            </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>نظرة عامة على العقود</CardTitle>
            <CardDescription>
              توزيع العقود التي بدأت في الفترة المحددة.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex h-64 w-full items-center justify-center">
                  <p>جارِ تحميل الرسم البياني...</p>
                </div>
              ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                 <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  allowDecimals={false}
                  orientation="right"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="count" radius={4} />
              </BarChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>عقود تتطلب الانتباه</CardTitle>
            <CardDescription>
              العقود المتأخرة أو التي تنتهي خلال أسبوع.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">تاريخ الانتهاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3} className="text-center">جارِ التحميل...</TableCell></TableRow>}
                {!isLoading && attentionContracts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">لا توجد عقود.</TableCell></TableRow>}
                {!isLoading && attentionContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="font-medium">{contract.clientName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {contract.type}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-left">
                      {format(new Date(contract.endDate), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
