
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
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';

export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const murabahaQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'murabahaContracts'), where('clientId', '==', user.uid));
    }, [firestore, user]);

    const mudarabahQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'mudarabahContracts'), where('clientId', '==', user.uid));
    }, [firestore, user]);
    
    const musharakahQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'musharakahContracts'), where('partnerIds', 'array-contains', user.uid));
    }, [firestore, user]);

    const wakalahQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'wakalahContracts'), where('clientId', '==', user.uid));
    }, [firestore, user]);

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


  const activeContracts = allContracts.filter(
    (c) => c.status === 'active'
  ).length;

  const totalContractValue = allContracts.reduce((sum, c) => {
    if (c.type === 'murabaha') {
      return sum + c.sellingPrice * c.units;
    }
    if (c.type === 'mudarabah') {
      return sum + c.capital;
    }
    if (c.type === 'musharakah' || c.type === 'wakalah') {
      return sum + c.amount;
    }
    return sum;
  }, 0);


  const overdueContracts = allContracts.filter(
    (c) => c.status === 'overdue'
  ).length;
  const attentionContracts = allContracts.filter(
    (c) => c.status === 'overdue' || c.status === 'active'
  ).slice(0, 5);

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
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <p className="text-muted-foreground">
          نظرة عامة على معاملاتك وعقودك المالية.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي قيمة العقود</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(totalContractValue)}</div>
            <p className="text-xs text-muted-foreground">
              +2.1% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : `+${activeContracts}`}</div>
            <p className="text-xs text-muted-foreground">
              +15.3% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقود المتأخرة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : overdueContracts}</div>
            <p className="text-xs text-muted-foreground">
               {overdueContracts > 0 ? <ArrowUpRight className="h-4 w-4 text-destructive inline"/> : <ArrowDownRight className="h-4 w-4 text-green-500 inline"/>} {overdueContracts > 0 ? '+2' : ''} عن الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الربح المتوقع</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(12530)}</div>
            <p className="text-xs text-muted-foreground">
              +19% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>نظرة عامة على العقود</CardTitle>
            <CardDescription>
              توزيع العقود حسب النوع خلال هذا العام.
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
              قائمة بالعقود التي قاربت على الانتهاء أو المتأخرة.
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
                {isLoading && <TableRow><TableCell colSpan={3}>جارِ التحميل...</TableCell></TableRow>}
                {!isLoading && attentionContracts.length === 0 && <TableRow><TableCell colSpan={3}>لا توجد عقود.</TableCell></TableRow>}
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
