
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
import { Pie, PieChart, Cell, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Activity,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useFirebase();

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return collection(firestore, 'users', user.uid, 'transactions');
    }, [firestore, user?.uid]);
    
    const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

    const stats = useMemo(() => {
        const active = transactions?.filter(t => t.status === 'active' || t.status === 'overdue') || [];
        const completed = transactions?.filter(t => t.status === 'completed') || [];
        
        const expectedProfit = active.reduce((sum, t) => sum + t.profit, 0);
        const totalDue = active.reduce((sum, t) => sum + t.remainingAmount, 0);
        const overdueCount = active.filter(t => t.status === 'overdue').length;

        return { expectedProfit, totalDue, overdueCount, activeCount: active.length, completedCount: completed.length };
    }, [transactions]);

    const attentionTransactions = useMemo(() => {
        const today = new Date();
        const oneWeekFromNow = addDays(today, 7);

        return (transactions || [])
            .filter(t => {
                if (t.status === 'completed' || t.status === 'archived') return false;
                const dueDate = new Date(t.dueDate);
                const isOverdue = t.status === 'overdue';
                const isEndingSoon = dueDate >= today && dueDate <= oneWeekFromNow;
                return isOverdue || isEndingSoon;
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
    }, [transactions]);


    const chartData = [
        { name: 'الديون المستحقة', value: stats.activeCount, fill: 'hsl(var(--destructive))' },
        { name: 'الديون المسددة', value: stats.completedCount, fill: 'hsl(var(--chart-2))' },
    ];

    const chartConfig = {
        value: { label: 'المعاملات' },
        'الديون المستحقة': { label: 'الديون المستحقة', color: 'hsl(var(--destructive))' },
        'الديون المسددة': { label: 'الديون المسددة', color: 'hsl(var(--chart-2))' },
    } satisfies ChartConfig;


  return (
    <div className="space-y-6">
       <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground">
            متابعة دقيقة ومريحة لأرباحك وديونك الحالية.
          </p>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأرباح المتوقعة</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="size-6 animate-spin"/> : formatCurrency(stats.expectedProfit)}</div>
                <p className="text-xs text-muted-foreground">
                من كل المعاملات الآجلة المفتوحة حاليًا.
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الرصيد الكلي المستحق</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="size-6 animate-spin"/> : formatCurrency(stats.totalDue)}</div>
                <p className="text-xs text-muted-foreground">
                إجمالي المبلغ الذي يدين به الزبائن.
                </p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المعاملات النشطة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="size-6 animate-spin"/> : `+${stats.activeCount}`}</div>
            <p className="text-xs text-muted-foreground">
              المعاملات التي لم تكتمل بعد.
            </p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المعاملات المتأخرة</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="size-6 animate-spin"/> : `+${stats.overdueCount}`}</div>
                <p className="text-xs text-muted-foreground">
                المعاملات التي تجاوزت تاريخ الاستحقاق.
                </p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>تنبيهات الاستحقاق القادمة</CardTitle>
            <CardDescription>
              أهم المعاملات التي تستحق السداد خلال الـ 7 أيام القادمة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الزبون</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead className="text-left">تاريخ الاستحقاق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className='mx-auto animate-spin'/></TableCell></TableRow>}
                {!isLoading && attentionTransactions.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">لا توجد معاملات تستحق قريبًا.</TableCell></TableRow>}
                {!isLoading && attentionTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/clients/${t.clientId}`} className="font-medium hover:underline">{t.clientName}</Link>
                    </TableCell>
                    <TableCell>{formatCurrency(t.remainingAmount)}</TableCell>
                    <TableCell className="text-left flex items-center justify-end gap-2">
                      <Clock className="size-4 text-muted-foreground"/>
                      <span>{format(new Date(t.dueDate), 'd MMMM', { locale: ar })}</span>
                      {t.status === 'overdue' && <Badge variant="destructive">متأخر</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>نظرة عامة على الديون</CardTitle>
            <CardDescription>
              نسبة المعاملات المسددة مقابل المستحقة.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex h-64 w-full items-center justify-center">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full max-h-[250px]">
                <PieChart>
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel indicator='dot' nameKey="name" />}
                    />
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5} />
                </PieChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

    