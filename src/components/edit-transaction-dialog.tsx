
'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import type { Transaction, Product, Client } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  quantity: z.coerce.number().min(1, { message: 'الكمية يجب أن تكون 1 على الأقل.' }),
  dueDate: z.date({ required_error: 'تاريخ الاستحقاق مطلوب.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  transaction: Transaction;
  onSuccess?: () => void;
}

export function EditTransactionDialog({ isOpen, setIsOpen, transaction, onSuccess }: EditTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const productRef = useMemoFirebase(() => {
    if (!firestore || !user || !transaction) return null;
    return doc(firestore, 'users', user.uid, 'products', transaction.productId);
  }, [firestore, user, transaction]);

  const clientRef = useMemoFirebase(() => {
    if (!firestore || !user || !transaction) return null;
    return doc(firestore, 'users', user.uid, 'clients', transaction.clientId);
  }, [firestore, user, transaction]);

  const { data: product } = useDoc<Product>(productRef);
  const { data: client } = useDoc<Client>(clientRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        quantity: transaction.quantity,
        dueDate: parseISO(transaction.dueDate),
      });
    }
  }, [transaction, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user || !transaction || !product || !client) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تحميل بيانات المنتج أو الزبون.' });
        return;
    }
    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);

    try {
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        
        const quantityDifference = data.quantity - transaction.quantity;
        
        // Check stock
        if (quantityDifference > product.stock) {
            form.setError('quantity', { message: 'الكمية الإضافية المطلوبة أكبر من المخزون المتاح.' });
            setIsSubmitting(false);
            return;
        }

        const newTotalAmount = data.quantity * transaction.sellingPrice;
        const newProfit = (transaction.sellingPrice - transaction.purchasePrice) * data.quantity;
        const amountDifference = newTotalAmount - transaction.totalAmount;
        const newRemainingAmount = transaction.remainingAmount + amountDifference;
        
        // 1. Update transaction
        batch.update(transactionRef, {
            quantity: data.quantity,
            dueDate: data.dueDate.toISOString(),
            totalAmount: newTotalAmount,
            profit: newProfit,
            remainingAmount: newRemainingAmount,
            status: data.dueDate < new Date() && newRemainingAmount > 0 ? 'overdue' : 'active',
        });

        // 2. Update product stock
        batch.update(productRef!, {
            stock: product.stock - quantityDifference
        });

        // 3. Update client total due
        batch.update(clientRef!, {
            totalDue: client.totalDue + amountDifference
        });

        await batch.commit();
        toast({ title: "تم تحديث المعاملة بنجاح!" });
        setIsOpen(false);
        if (onSuccess) onSuccess();

    } catch (error) {
        console.error("Error updating transaction: ", error);
        toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث المعاملة." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل المعاملة</DialogTitle>
          <DialogDescription>
            تعديل الكمية أو تمديد تاريخ الاستحقاق للمعاملة.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الكمية</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الاستحقاق الجديد</FormLabel>
                     <Popover modal={true}>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn('w-full ps-3 text-start font-normal', !field.value && 'text-muted-foreground')}
                            >
                                {field.value ? format(field.value, 'PPP', { locale: ar }) : <span>اختر تاريخًا</span>}
                                <Calendar className="ms-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(transaction.issueDate)}
                                initialFocus
                                locale={ar}
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
