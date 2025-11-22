
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
import { commodityCards } from '@/lib/data';
import type { CommodityCard } from '@/lib/types';


export default function CommoditiesPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const getStatusBadge = (status: CommodityCard['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant='secondary' className="bg-green-600 hover:bg-green-700 text-white">متاحة</Badge>;
      case 'in-use':
        return <Badge variant="default">قيد الاستخدام</Badge>;
      case 'expired':
        return <Badge variant="destructive">منتهية الصلاحية</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          بطاقات السلع
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة بطاقات السلع المتاحة.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة البطاقات</CardTitle>
          <CardDescription>
            جميع بطاقات السلع المتاحة وقيد الاستخدام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم البطاقة</TableHead>
                <TableHead>القيمة الاسمية</TableHead>
                <TableHead>جهة الإصدار</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodityCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className='font-mono'>{card.cardNumber}</TableCell>
                  <TableCell>{formatCurrency(card.nominalValue)}</TableCell>
                  <TableCell>{card.issuingBody}</TableCell>
                  <TableCell>{getStatusBadge(card.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
