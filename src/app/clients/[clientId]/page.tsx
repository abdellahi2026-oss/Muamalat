
'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useFirebase,
} from '@/firebase';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import type { Client, Transaction } from '@/lib/types';
import { Loader2, ArrowLeft, Phone, User, HandCoins } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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


function RegisterPaymentDialog({ client, transactions, onPaymentSuccess }: { client: Client, transactions: Transaction[], onPaymentSuccess: () => void }) {
    const [amount, setAmount] = useState<number | ''>('');
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const handleRegisterPayment = async () => {
        if (!firestore || !user || !amount || amount <= 0) {
            toast({ variant: 'destructive', title: 'الرجاء إدخال مبلغ صحيح.' });
            return;
        }

        if (amount > client.totalDue) {
            toast({ variant: 'destructive', title: 'المبلغ المدفوع أكبر من إجمالي المستحقات.'});
            return;
        }

        setIsSubmitting(true);
        
        let remainingPayment = amount;
        const batch = writeBatch(firestore);

        // Sort transactions: overdue first, then oldest
        const sortedTransactions = [...transactions]
            .filter(t => t.status === 'active' || t.status === 'overdue')
            .sort((a,b) => {
                if (a.status === 'overdue' && b.status !== 'overdue') return -1;
                if (b.status === 'overdue' && a.status !== 'overdue') return 1;
                return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
            });

        for (const trans of sortedTransactions) {
            if (remainingPayment <= 0) break;

            const paymentForThisTransaction = Math.min(remainingPayment, trans.remainingAmount);
            
            const transactionRef = doc(firestore, 'users', user.uid, 'transactions', trans.id);
            const newPaidAmount = trans.paidAmount + paymentForThisTransaction;
            const newRemainingAmount = trans.remainingAmount - paymentForThisTransaction;
            const newStatus = newRemainingAmount <= 0 ? 'completed' : trans.status;

            batch.update(transactionRef, {
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                status: newStatus,
            });

            remainingPayment -= paymentForThisTransaction;
        }

        // Update client's totalDue
        const clientRef = doc(firestore, 'users', user.uid, 'clients', client.id);
        const newTotalDue = client.totalDue - amount;
        batch.update(clientRef, { totalDue: newTotalDue });

        try {
            await batch.commit();
            toast({ title: 'تم تسجيل الدفعة بنجاح!' });
            setAmount('');
            setOpen(false);
            onPaymentSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'حدث خطأ أثناء تسجيل الدفعة.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button disabled={client.totalDue <= 0}>
                    <HandCoins className="me-2" />
                    تسجيل دفعة
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تسجيل دفعة جديدة لـ {client.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                        أدخل المبلغ الذي دفعه الزبون. سيتم توزيعه تلقائيًا على أقدم معاملة مستحقة.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Input
                        type="number"
                        placeholder={`إجمالي المستحق: ${formatCurrency(client.totalDue)}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        dir="ltr"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegisterPayment} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 animate-spin"/>}
                        حفظ الدفعة
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function ClientDetailPage() {
  const { firestore, user } = useFirebase();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.clientId as string;

  const clientDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !clientId) return null;
    return doc(firestore, 'users', user.uid, 'clients', clientId);
  }, [firestore, user?.uid, clientId]);
  
  const { data: client, isLoading: isClientLoading, refetch: refetchClient } = useDoc<Client>(clientDocRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !clientId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      where('clientId', '==', clientId)
    );
  }, [firestore, user?.uid, clientId]);
  
  const { data: transactions, isLoading: areTransactionsLoading, refetch: refetchTransactions } = useCollection<Transaction>(transactionsQuery);

  const handlePaymentSuccess = () => {
    if (refetchClient) refetchClient();
    if (refetchTransactions) refetchTransactions();
  }

  const isLoading = isClientLoading || areTransactionsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center">
        <p>لم يتم العثور على الزبون.</p>
        <Button onClick={() => router.back()} className="mt-4">
          العودة
        </Button>
      </div>
    );
  }
  
  const sortedTransactions = (transactions || []).sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <User/> {client.name}
          </h1>
          {client.phone && (
            <div className="flex items-center text-muted-foreground gap-2">
                <Phone className='size-4'/>
                <span dir="ltr">{client.phone}</span>
            </div>
          )}
        </div>
      </div>
      
       <Card>
        <CardHeader>
            <CardTitle>ملخص المعاملات</CardTitle>
            <CardDescription>إجمالي المستحقات وآخر المعاملات المفتوحة.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className='space-y-2'>
                <p className='font-semibold'>إجمالي الرصيد المستحق</p>
                <p className='text-3xl font-bold text-red-600'>{formatCurrency(client.totalDue)}</p>
           </div>
            <div className='flex items-center justify-end'>
                 <RegisterPaymentDialog client={client} transactions={sortedTransactions} onPaymentSuccess={handlePaymentSuccess} />
            </div>
        </CardContent>
       </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج والكمية</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    لا توجد معاملات لهذا الزبون.
                  </TableCell>
                </TableRow>
              )}
              {sortedTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className='font-medium'>{t.productName}</div>
                    <div className='text-sm text-muted-foreground'>الكمية: {t.quantity}</div>
                  </TableCell>
                   <TableCell>
                        <div className="flex flex-col gap-2">
                            <span className='font-semibold'>{formatCurrency(t.remainingAmount)} متبقي</span>
                            <Progress value={(t.paidAmount / t.totalAmount) * 100} className="h-2" />
                            <span className='text-xs text-muted-foreground'>تم دفع {formatCurrency(t.paidAmount)} من {formatCurrency(t.totalAmount)}</span>
                        </div>
                   </TableCell>
                  <TableCell>
                      {formatDistanceToNow(new Date(t.dueDate), { addSuffix: true, locale: ar })}
                  </TableCell>
                  <TableCell>{getStatusBadge(t.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
