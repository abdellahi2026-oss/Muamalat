
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
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, writeBatch, getDoc, collection } from 'firebase/firestore';
import type { Transaction, Product, Client } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Combobox } from './ui/combobox';

const formSchema = z.object({
  productId: z.string().min(1, { message: 'يجب اختيار منتج.' }),
  quantity: z.coerce.number().min(1, { message: 'الكمية يجب أن تكون 1 على الأقل.' }),
  purchasePrice: z.coerce.number().min(0, { message: 'سعر الشراء إجباري.' }),
  sellingPrice: z.coerce.number().min(0, { message: 'سعر البيع إجباري.' }),
  issueDate: z.date({ required_error: 'تاريخ الإنشاء مطلوب.' }),
  dueDate: z.date({ required_error: 'تاريخ الاستحقاق مطلوب.' }),
}).refine(data => data.sellingPrice > data.purchasePrice, {
    message: "سعر البيع يجب أن يكون أعلى من سعر الشراء.",
    path: ['sellingPrice'],
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

  // Load all products for the combobox
  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user?.uid]);
  const { data: products } = useCollection<Product>(productsQuery);

  const productOptions = useMemo(() => 
    (products || []).map(p => ({ 
        value: p.id, 
        label: `${p.name} (متوفر: ${p.stock})` 
    }))
  , [products]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const {productId: selectedProductId, quantity, purchasePrice, sellingPrice, issueDate, dueDate} = form.watch();

  useEffect(() => {
    if (transaction) {
      form.reset({
        productId: transaction.productId,
        quantity: transaction.quantity,
        purchasePrice: transaction.purchasePrice,
        sellingPrice: transaction.sellingPrice,
        issueDate: parseISO(transaction.issueDate),
        dueDate: parseISO(transaction.dueDate),
      });
    }
  }, [transaction, form]);
  
  // Auto-fill prices when a new product is selected from the list, but not for the initial load
  useEffect(() => {
      if (selectedProductId && products && selectedProductId !== transaction.productId) {
          const product = products.find(p => p.id === selectedProductId);
          if (product) {
              form.setValue('purchasePrice', product.purchasePrice);
              form.setValue('sellingPrice', product.sellingPrice);
          }
      }
  }, [selectedProductId, products, form, transaction.productId]);


  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user || !transaction) return;
    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);

    try {
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        const clientRef = doc(firestore, 'users', user.uid, 'clients', transaction.clientId);
        
        const oldProductRef = doc(firestore, 'users', user.uid, 'products', transaction.productId);
        const newProductRef = doc(firestore, 'users', user.uid, 'products', data.productId);

        const [clientDoc, oldProductDoc, newProductDoc] = await Promise.all([
            getDoc(clientRef),
            getDoc(oldProductRef),
            getDoc(newProductRef)
        ]);

        if (!clientDoc.exists() || !oldProductDoc.exists() || !newProductDoc.exists()) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن العثور على بيانات العميل أو المنتج.' });
            setIsSubmitting(false);
            return;
        }

        const clientData = clientDoc.data() as Client;
        const oldProductData = oldProductDoc.data() as Product;
        const newProductData = newProductDoc.data() as Product;

        const quantityDifference = data.quantity - transaction.quantity;

        // Stock validation
        if (data.productId === transaction.productId) { // Same product
            if (quantityDifference > oldProductData.stock) {
                 form.setError('quantity', { message: `الكمية الإضافية تتجاوز المخزون (${oldProductData.stock} متاح).` });
                 setIsSubmitting(false);
                 return;
            }
        } else { // Different product
            if (data.quantity > newProductData.stock) {
                 form.setError('quantity', { message: `الكمية المطلوبة تتجاوز مخزون المنتج الجديد (${newProductData.stock} متاح).` });
                 setIsSubmitting(false);
                 return;
            }
        }
        
        // --- Batch updates ---
        
        // 1. Update stock
        if (data.productId === transaction.productId) {
            batch.update(oldProductRef, { stock: oldProductData.stock - quantityDifference });
        } else {
            // Restore stock for old product
            batch.update(oldProductRef, { stock: oldProductData.stock + transaction.quantity });
            // Decrement stock for new product
            batch.update(newProductRef, { stock: newProductData.stock - data.quantity });
        }
        
        const days = differenceInDays(data.dueDate, data.issueDate);
        const months = Math.max(1, Math.ceil(days / 30));
        const originalProduct = products?.find(p => p.id === data.productId);
        // Use the base prices from the product data, not the form, to ensure profit is calculated correctly
        const baseSellingPrice = originalProduct?.sellingPrice || data.sellingPrice;
        const basePurchasePrice = originalProduct?.purchasePrice || data.purchasePrice;

        const singleMonthProfit = (baseSellingPrice - basePurchasePrice) * data.quantity;
        const newProfit = singleMonthProfit * months;
        const newTotalAmount = (basePurchasePrice * data.quantity) + newProfit;


        // Recalculate remaining amount based on paid amount and new total
        const newRemainingAmount = Math.max(0, newTotalAmount - transaction.paidAmount);

        batch.update(transactionRef, {
            productId: data.productId,
            productName: newProductData.name,
            quantity: data.quantity,
            purchasePrice: basePurchasePrice,
            sellingPrice: newTotalAmount / data.quantity, // Calculated selling price per unit
            issueDate: data.issueDate.toISOString(),
            dueDate: data.dueDate.toISOString(),
            totalAmount: newTotalAmount,
            profit: newProfit,
            remainingAmount: newRemainingAmount,
            status: data.dueDate < new Date() && newRemainingAmount > 0.01 ? 'overdue' : 'active',
        });

        // 3. Update client total due
        const clientTotalDueDifference = newRemainingAmount - transaction.remainingAmount;
        batch.update(clientRef, {
            totalDue: clientData.totalDue + clientTotalDueDifference
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل المعاملة</DialogTitle>
          <DialogDescription>
            تعديل تفاصيل المعاملة. سيتم تحديث المخزون وديون العميل تلقائيًا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>المنتج</FormLabel>
                    <Combobox
                        options={productOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="ابحث عن منتج..."
                        notFoundText="لا توجد منتجات."
                    />
                    <FormMessage />
                    </FormItem>
                )}
            />
            
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

            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>سعر الشراء</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>سعر البيع (لشهر)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>تاريخ الإنشاء</FormLabel>
                        <Popover modal={true}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={'outline'} className={cn('w-full ps-3 text-start font-normal', !field.value && 'text-muted-foreground')}>
                                    {field.value ? format(field.value, 'PPP', { locale: ar }) : <span>اختر تاريخًا</span>}
                                    <Calendar className="ms-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarPicker mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ar} />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>تاريخ الاستحقاق</FormLabel>
                        <Popover modal={true}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={'outline'} className={cn('w-full ps-3 text-start font-normal', !field.value && 'text-muted-foreground')}>
                                    {field.value ? format(field.value, 'PPP', { locale: ar }) : <span>اختر تاريخًا</span>}
                                    <Calendar className="ms-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarPicker mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < form.getValues('issueDate')} initialFocus locale={ar} />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

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

    