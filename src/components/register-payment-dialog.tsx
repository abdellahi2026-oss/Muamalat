
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, query, where } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Combobox } from './ui/combobox';
import type { Client, Transaction } from '@/lib/types';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

const formSchema = z.object({
  clientId: z.string().min(1, { message: 'يجب اختيار زبون.' }),
  transactionId: z.string().min(1, { message: 'يجب اختيار معاملة.' }),
  amount: z.coerce.number().positive({ message: 'المبلغ يجب أن يكون أكبر من صفر.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface RegisterPaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onSuccess?: () => void;
}

export function RegisterPaymentDialog({ isOpen, setIsOpen, onSuccess }: RegisterPaymentDialogProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: '', transactionId: '', amount: undefined },
  });

  const selectedClientId = form.watch('clientId');
  const selectedTransactionId = form.watch('transactionId');

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'clients');
  }, [firestore, user?.uid, isOpen]); // Rerun when dialog opens
  
  const { data: clients, refetch: refetchClients } = useCollection<Client>(clientsQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !selectedClientId) return null;
    return query(
        collection(firestore, 'users', user.uid, 'transactions'),
        where('clientId', '==', selectedClientId),
        where('status', 'in', ['active', 'overdue'])
    );
  }, [firestore, user?.uid, selectedClientId]);
  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

   useEffect(() => {
      if (isOpen && refetchClients && user) {
        refetchClients();
      }
  }, [isOpen, refetchClients, user]);
  
  useEffect(() => {
    // Reset transaction when client changes
    form.setValue('transactionId', '');
  }, [selectedClientId, form]);


  const clientOptions = useMemo(() => 
    (clients || []).map(c => ({ value: c.id, label: c.name }))
  , [clients]);

  const transactionOptions = useMemo(() => 
    (transactions || []).map(t => ({ 
        value: t.id, 
        label: `${t.productName} - متبقي: ${formatCurrency(t.remainingAmount)}`
    }))
  , [transactions]);

  const selectedTransaction = useMemo(() => 
    transactions?.find(t => t.id === selectedTransactionId)
  , [transactions, selectedTransactionId]);


  const goToNextStep = async () => {
      const isValid = await form.trigger(['clientId']);
      if(isValid) setStep(2);
  };
  const goToPrevStep = () => setStep(1);

  const resetForm = () => {
    form.reset();
    setStep(1);
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user || !selectedTransaction) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'حدث خطأ غير متوقع.' });
      return;
    }
    
    // Use a small epsilon to handle floating point inaccuracies
    if (data.amount > selectedTransaction.remainingAmount + 0.01) {
        form.setError('amount', { message: 'المبلغ المدفوع أكبر من المبلغ المتبقي للمعاملة.'});
        return;
    }

    const batch = writeBatch(firestore);

    // 1. Update Transaction
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', data.transactionId);
    const newPaidAmount = Math.round((selectedTransaction.paidAmount + data.amount) * 100) / 100;
    const newRemainingAmount = Math.round((selectedTransaction.remainingAmount - data.amount) * 100) / 100;
    const newStatus = newRemainingAmount <= 0.01 ? 'completed' : selectedTransaction.status;
    
    batch.update(transactionRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus
    });

    // 2. Update Client's totalDue
    const clientRef = doc(firestore, 'users', user.uid, 'clients', data.clientId);
    const client = clients?.find(c => c.id === data.clientId);
    if (client) {
        const newTotalDue = Math.round((client.totalDue - data.amount) * 100) / 100;
        batch.update(clientRef, { totalDue: newTotalDue });
    }

    try {
        await batch.commit();
        toast({
            title: 'تم تسجيل الدفعة بنجاح!',
            description: `تم تسجيل دفعة بقيمة ${formatCurrency(data.amount)}.`,
        });
        setIsOpen(false);
        resetForm();
        if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error registering payment: ', error);
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تسجيل الدفعة. يرجى المحاولة مرة أخرى.',
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             {step > 1 && (
                <Button variant="ghost" size="icon" onClick={goToPrevStep} className="me-2">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
             )}
            تسجيل دفعة
          </DialogTitle>
          <DialogDescription>
            اختر الزبون والمعاملة ثم أدخل المبلغ المدفوع.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form id="paymentForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {step === 1 && (
                <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>الزبون</FormLabel>
                        <Combobox
                            options={clientOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="ابحث عن زبون..."
                            notFoundText="لم يتم العثور على زبون."
                        />
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {step === 2 && (
                <>
                <FormField
                    control={form.control}
                    name="transactionId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>المعاملة</FormLabel>
                        <Combobox
                            options={transactionOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={transactionsLoading ? "جار التحميل..." : "اختر معاملة..."}
                            notFoundText="لا توجد ديون على هذا الزبون."
                        />
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {selectedTransaction && (
                     <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>المبلغ المدفوع</FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                placeholder={`المتبقي: ${formatCurrency(selectedTransaction.remainingAmount)}`}
                                {...field} 
                                dir="ltr"
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
                </>
            )}
          </form>
        </Form>
        
        <DialogFooter>
           <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
           {step === 1 && (
            <Button onClick={goToNextStep} disabled={!selectedClientId}>
                التالي
            </Button>
           )}
           {step === 2 && (
            <Button type="submit" form="paymentForm" disabled={isSubmitting || !selectedTransactionId}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ الدفعة
            </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    