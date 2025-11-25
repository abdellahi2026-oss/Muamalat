
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
import { Loader2, ArrowLeft, ShoppingCart, Calendar, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Combobox } from './ui/combobox';
import type { Client, Product, Transaction } from '@/lib/types';
import { addDays, format, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const stepOneSchema = z.object({
  clientId: z.string().min(1, { message: 'يجب اختيار زبون.' }),
  newClientName: z.string().optional(),
  newClientPhone: z.string().optional(),
  referredBy: z.string().optional(),
  productId: z.string().min(1, { message: 'يجب اختيار منتج.' }),
}).refine(data => {
    if (data.clientId === 'new-client') {
        return !!data.newClientName && data.newClientName.length >= 2;
    }
    return true;
}, {
    message: 'يجب إدخال اسم العميل الجديد (حرفين على الأقل).',
    path: ['newClientName'],
}).refine(data => {
    if (data.clientId === 'new-client') {
        return !!data.newClientPhone && data.newClientPhone.length > 0;
    }
    return true;
}, {
    message: 'رقم هاتف العميل الجديد إجباري.',
    path: ['newClientPhone'],
});

const stepTwoSchema = z.object({
  quantity: z.coerce.number().min(1, { message: 'الكمية يجب أن تكون 1 على الأقل.' }),
  paymentDuration: z.string().min(1, 'يجب تحديد مدة السداد.'),
  customDueDate: z.date().optional(),
});

type StepOneValues = z.infer<typeof stepOneSchema>;
type StepTwoValues = z.infer<typeof stepTwoSchema>;

interface AddTransactionDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddTransactionDialog({ isOpen, setIsOpen, onSuccess }: AddTransactionDialogProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const stepOneForm = useForm<StepOneValues>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: { clientId: '', productId: '', newClientName: '', newClientPhone: '', referredBy: '' },
  });

  const stepTwoForm = useForm<StepTwoValues>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: { quantity: 1, paymentDuration: '30' },
  });
  
  const selectedClientId = stepOneForm.watch('clientId');
  const selectedProductId = stepOneForm.watch('productId');
  const { quantity, paymentDuration, customDueDate } = stepTwoForm.watch();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'clients');
  }, [firestore, user?.uid]);
  const { data: clients, refetch: refetchClients } = useCollection<Client>(clientsQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user?.uid]);
  const { data: products, refetch: refetchProducts } = useCollection<Product>(productsQuery);

  const clientOptions = useMemo(() => {
    const options = (clients || []).map(c => ({ value: c.id, label: c.name }));
    options.unshift({ value: 'new-client', label: 'إضافة زبون جديد...' });
    return options;
  }, [clients]);

  const referrerOptions = useMemo(() => 
    (clients || []).map(c => ({ value: c.id, label: c.name }))
  , [clients]);


  const productOptions = useMemo(() => 
    (products || []).map(p => ({ value: p.id, label: `${p.name} (متوفر: ${p.stock})` }))
  , [products]);
  
  const selectedProduct = useMemo(() => 
    products?.find(p => p.id === selectedProductId)
  , [products, selectedProductId]);

  const { totalAmount, totalProfit } = useMemo(() => {
    if (!selectedProduct || !quantity) {
        return { totalAmount: 0, totalProfit: 0 };
    }

    const issueDate = new Date();
    let finalDueDate: Date;
    if (paymentDuration === 'custom' && customDueDate) {
        finalDueDate = customDueDate;
    } else {
        finalDueDate = addDays(issueDate, parseInt(paymentDuration));
    }
    const days = differenceInDays(finalDueDate, issueDate);
    const months = Math.max(1, Math.ceil(days / 30));

    const singleMonthProfit = (selectedProduct.sellingPrice - selectedProduct.purchasePrice) * quantity;
    const calculatedProfit = singleMonthProfit * months;
    const calculatedTotalAmount = (selectedProduct.purchasePrice * quantity) + calculatedProfit;
    
    return { totalAmount: calculatedTotalAmount, totalProfit: calculatedProfit };
  }, [selectedProduct, quantity, paymentDuration, customDueDate]);


  const goToNextStep = () => setStep(2);
  const goToPrevStep = () => setStep(1);

  const resetForms = () => {
    stepOneForm.reset();
    stepTwoForm.reset({ quantity: 1, paymentDuration: '30' });
    setStep(1);
  };
  
  useEffect(() => {
      if (isOpen) {
        if(refetchClients) refetchClients();
        if(refetchProducts) refetchProducts();
      }
  }, [isOpen, refetchClients, refetchProducts]);

  const onSubmit = async () => {
    const isStepOneValid = await stepOneForm.trigger();
    const isStepTwoValid = await stepTwoForm.trigger();
    if (!isStepOneValid || !isStepTwoValid) {
        toast({ variant: 'destructive', title: 'الرجاء إكمال جميع الحقول المطلوبة.' });
        return;
    }

    if (!firestore || !user || !selectedProduct) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'حدث خطأ غير متوقع.' });
      return;
    }
    
    if (quantity > selectedProduct.stock) {
        stepTwoForm.setError('quantity', { message: 'الكمية المطلوبة أكبر من المتوفر في المخزون.' });
        return;
    }

    const { clientId, newClientName, newClientPhone, referredBy } = stepOneForm.getValues();

    const batch = writeBatch(firestore);
    let finalClientId = clientId;
    let finalClientName = clients?.find(c => c.id === clientId)?.name || '';

    if (clientId === 'new-client') {
      const newClientRef = doc(collection(firestore, 'users', user.uid, 'clients'));
      finalClientId = newClientRef.id;
      finalClientName = newClientName!;
      const newClient: Client = {
        id: finalClientId,
        name: finalClientName,
        phone: newClientPhone!,
        totalDue: totalAmount,
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
        referredBy: referredBy || '',
      };
      batch.set(newClientRef, newClient);
    }

    const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    const issueDate = new Date();
    let dueDate: Date;
    if (paymentDuration === 'custom' && customDueDate) {
        dueDate = customDueDate;
    } else {
        dueDate = addDays(issueDate, parseInt(paymentDuration));
    }

    const newTransaction: Transaction = {
        id: newTransactionRef.id,
        clientId: finalClientId,
        clientName: finalClientName,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        purchasePrice: selectedProduct.purchasePrice,
        // The selling price stored is the *calculated* price for the full duration
        sellingPrice: totalAmount / quantity,
        totalAmount,
        profit: totalProfit,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'active',
        paidAmount: 0,
        remainingAmount: totalAmount,
        ownerId: user.uid,
    };
    batch.set(newTransactionRef, newTransaction);
    
    const productRef = doc(firestore, 'users', user.uid, 'products', selectedProduct.id);
    batch.update(productRef, { stock: selectedProduct.stock - quantity });
    
    if (clientId !== 'new-client') {
        const clientRef = doc(firestore, 'users', user.uid, 'clients', finalClientId);
        const existingClient = clients?.find(c => c.id === finalClientId);
        const newTotalDue = (existingClient?.totalDue || 0) + totalAmount;
        batch.update(clientRef, { totalDue: newTotalDue });
    }

    try {
        await batch.commit();
        toast({
            title: 'تمت إضافة المعاملة بنجاح!',
            description: `تم إنشاء معاملة جديدة لـ ${finalClientName}.`,
        });
        setIsOpen(false);
        resetForms();
        if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding transaction: ', error);
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من حفظ المعاملة. يرجى المحاولة مرة أخرى.',
      });
    }
  };

  const isSubmitting = stepOneForm.formState.isSubmitting || stepTwoForm.formState.isSubmitting;
  const paymentDurationValue = stepTwoForm.watch('paymentDuration');

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForms(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             {step === 2 && (
                <Button variant="ghost" size="icon" onClick={goToPrevStep} className="me-2">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
             )}
            {step === 1 ? 'الخطوة 1: الزبون والمنتج' : 'الخطوة 2: الكمية والمدة'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'اختر الزبون والمنتج لبدء معاملة جديدة.' : 'أدخل الكمية وحدد مدة السداد.'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
            <Form {...stepOneForm}>
            <form id="stepOneForm" onSubmit={stepOneForm.handleSubmit(goToNextStep)} className="grid gap-4 py-4">
                <FormField
                    control={stepOneForm.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>اسم الزبون</FormLabel>
                        <Combobox
                            options={clientOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="ابحث عن زبون أو أضف جديد..."
                            notFoundText="لم يتم العثور على زبون."
                        />
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedClientId === 'new-client' && (
                    <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={stepOneForm.control}
                                name="newClientName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>اسم الزبون الجديد</FormLabel>
                                        <FormControl><Input placeholder="الاسم الكامل" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={stepOneForm.control}
                                name="newClientPhone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>هاتف الزبون</FormLabel>
                                        <FormControl><Input placeholder="رقم الهاتف" {...field} dir="ltr"/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={stepOneForm.control}
                            name="referredBy"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>الزبون المُحيل (اختياري)</FormLabel>
                                <Combobox
                                    options={referrerOptions}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="ابحث عن زبون حالي..."
                                    notFoundText="لم يتم العثور على زبون."
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                 <FormField
                    control={stepOneForm.control}
                    name="productId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>اختر المنتج</FormLabel>
                        <Combobox
                            options={productOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="ابحث عن منتج..."
                            notFoundText="لا توجد منتجات. أضف منتجًا أولاً."
                        />
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
            </Form>
        )}

        {step === 2 && (
            <Form {...stepTwoForm}>
            <form id="stepTwoForm" onSubmit={stepTwoForm.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                 <FormField
                    control={stepTwoForm.control}
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
                  control={stepTwoForm.control}
                  name="paymentDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مدة السداد</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر مدة السداد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="7">7 أيام</SelectItem>
                          <SelectItem value="15">15 يومًا</SelectItem>
                          <SelectItem value="30">شهر واحد</SelectItem>
                          <SelectItem value="60">شهران</SelectItem>
                          <SelectItem value="90">3 أشهر</SelectItem>
                          <SelectItem value="custom">تاريخ محدد</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {paymentDurationValue === 'custom' && (
                    <FormField
                        control={stepTwoForm.control}
                        name="customDueDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>تاريخ الاستحقاق المحدد</FormLabel>
                             <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={'outline'}
                                        className={cn('w-full ps-3 text-start font-normal', !field.value && 'text-muted-foreground')}
                                    >
                                        {field.value ? format(field.value, 'PPP') : <span>اختر تاريخًا</span>}
                                        <Calendar className="ms-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarPicker
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
                
                {selectedProduct && quantity > 0 && (
                    <div className="space-y-2 rounded-md border bg-muted p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><ShoppingCart className='size-4'/> مبلغ القرض الإجمالي</span>
                            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><Info className='size-4'/> الربح المتوقع</span>
                            <span className="font-semibold text-green-600">{formatCurrency(totalProfit)}</span>
                        </div>
                    </div>
                )}
            </form>
            </Form>
        )}

        <DialogFooter>
           <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
           {step === 1 && (
            <Button type="submit" form="stepOneForm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                التالي
            </Button>
           )}
           {step === 2 && (
            <Button type="submit" form="stepTwoForm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ المعاملة
            </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

    