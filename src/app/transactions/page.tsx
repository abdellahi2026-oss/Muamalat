
'use client';

import { useMemo, useState, useEffect } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { Loader2, MoreVertical, Edit, Trash2, SlidersHorizontal, ArrowLeft, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-MR', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusBadge = (status: Transaction['status']) => {
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

function TransactionActions({ transaction, onEdit, onDelete }: { transaction: Transaction, onEdit: () => void, onDelete: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onEdit}>
            <Edit className="me-2 h-4 w-4" />
            تعديل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-500">
            <Trash2 className="me-2 h-4 w-4" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا إلى حذف المعاملة نهائيًا. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function TransactionsPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && ['active', 'overdue', 'completed', 'archived'].includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'transactions');
  }, [firestore, user?.uid]);

  const { data: transactions, isLoading, refetch } = useCollection<Transaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = transactions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (dateRange?.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        filtered = filtered.filter(t => {
            const issueDate = new Date(t.issueDate);
            return issueDate >= from && issueDate <= to;
        })
    }

    return filtered.sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [transactions, statusFilter, dateRange]);

  const handleSuccess = () => {
    if (refetch) refetch();
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!firestore || !user) return;
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
    try {
      await deleteDoc(transactionRef);
      // NOTE: For full data consistency, a batched write or a cloud function
      // should be used to also update client totalDue and product stock.
      // This is a simplified client-side delete for now.
      toast({ title: 'تم حذف المعاملة' });
      handleSuccess();
    } catch (e) {
      toast({ variant: 'destructive', title: 'فشل حذف المعاملة' });
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setStatusFilter('all');
    router.replace('/transactions'); // Remove query params from URL
  };

  const hasFilters = dateRange !== undefined || statusFilter !== 'all';


  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold tracking-tight">المعاملات</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>سجل المعاملات</CardTitle>
            <CardDescription>عرض وتصفية جميع المعاملات المسجلة.</CardDescription>
             <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="تصفية بالحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="archived">مؤرشفة</SelectItem>
                  </SelectContent>
                </Select>
                 {hasFilters && (
                    <Button variant="ghost" onClick={clearFilters}>
                        <X className="me-2"/>
                        مسح الفلاتر
                    </Button>
                )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الزبون / المنتج</TableHead>
                  <TableHead>حالة السداد</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <Loader2 className="mx-auto animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      لا توجد معاملات تطابق معايير التصفية الحالية.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <button onClick={() => router.push(`/clients/${t.clientId}`)} className="font-medium hover:underline text-right block">{t.clientName}</button>
                      <div className='text-sm text-muted-foreground'>
                        {t.productName} (x{t.quantity})
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <span className='font-semibold'>{formatCurrency(t.remainingAmount)} متبقي</span>
                        <Progress value={(t.paidAmount / t.totalAmount) * 100} className="h-2" />
                        <span className='text-xs text-muted-foreground'>
                          {formatCurrency(t.paidAmount)} / {formatCurrency(t.totalAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(t.dueDate), { addSuffix: true, locale: ar })}
                    </TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell>
                      <TransactionActions
                        transaction={t}
                        onEdit={() => setEditTransaction(t)}
                        onDelete={() => handleDelete(t)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {editTransaction && (
        <EditTransactionDialog
          isOpen={!!editTransaction}
          setIsOpen={(isOpen) => !isOpen && setEditTransaction(null)}
          transaction={editTransaction}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
