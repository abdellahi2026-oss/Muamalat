
'use client';

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
import { allContracts } from '@/lib/data';
import type { MurabahaContract } from '@/lib/types';
import { format } from 'date-fns';

export default function MurabahaPage() {
  const murabahaContracts = allContracts.filter(
    (c) => c.type === 'murabaha'
  ) as MurabahaContract[];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const getStatusBadge = (status: MurabahaContract['status']) => {
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
          عقود المرابحة
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة عقود المرابحة الخاصة بك.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة العقود</CardTitle>
          <CardDescription>
            جميع عقود المرابحة الحالية والسابقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>السلعة</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {murabahaContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.clientName}</TableCell>
                  <TableCell>{contract.goods}</TableCell>
                  <TableCell>{formatCurrency(contract.sellingPrice)}</TableCell>
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
