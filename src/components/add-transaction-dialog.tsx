
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PlusCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';

const formSchema = z
  .object({
    clientName: z
      .string()
      .min(3, { message: 'يجب أن يكون اسم العميل 3 أحرف على الأقل.' }),
    goods: z.string().min(2, { message: 'يجب إدخال وصف للسلعة.' }),
    units: z.coerce
      .number()
      .positive({ message: 'يجب أن تكون الكمية رقمًا موجبًا.' }),
    purchasePrice: z.coerce
      .number()
      .positive({ message: 'يجب أن يكون سعر الشراء رقمًا موجبًا.' }),
    sellingPrice: z.coerce
      .number()
      .positive({ message: 'يجب أن يكون سعر البيع رقمًا موجبًا.' }),
    startDate: z.date({
      required_error: 'يجب إدخال تاريخ البدء.',
    }),
    endDate: z.date({
      required_error: 'يجب إدخال تاريخ الانتهاء.',
    }),
  })
  .refine((data) => data.sellingPrice > data.purchasePrice, {
    message: 'سعر البيع يجب أن يكون أكبر من سعر الشراء.',
    path: ['sellingPrice'],
  });

type FormValues = z.infer<typeof formSchema>;

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      goods: '',
      units: '' as any,
      purchasePrice: '' as any,
      sellingPrice: '' as any,
      startDate: undefined,
      endDate: undefined,
    },
  });

  const { units, purchasePrice, sellingPrice } = form.watch();
  const totalProfit =
    units > 0 && purchasePrice > 0 && sellingPrice > 0
      ? (sellingPrice - purchasePrice) * units
      : null;
      
  const totalAmount =
    units > 0 && sellingPrice > 0
      ? sellingPrice * units
      : 0;

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن إضافة معاملة بدون تسجيل الدخول.',
      });
      return;
    }

    try {
      const contractData = {
        clientName: data.clientName,
        goods: data.goods,
        units: data.units,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        clientId: user.uid,
        type: 'murabaha',
        status: 'active',
        paymentMethod: 'أقساط شهرية',
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        amount: data.sellingPrice * data.units,
      };
      
      const docRef = await addDoc(
        collection(firestore, 'clients', user.uid, 'murabahaContracts'),
        contractData
      );

      toast({
        title: 'تمت إضافة المعاملة بنجاح!',
        description: `تم إنشاء عقد مرابحة جديد لـ ${data.clientName}.`,
      });

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من حفظ المعاملة. يرجى المحاولة مرة أخرى.',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <PlusCircle className="me-2" />
          إضافة معاملة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>إضافة معاملة جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل عقد المرابحة الجديد.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السلعة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أسمنت، حديد..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="units"
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
                    <FormLabel>سعر الشراء للقطعة</FormLabel>
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
                    <FormLabel>سعر البيع للقطعة</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {totalProfit !== null && (
              <div className="rounded-md border bg-muted p-3 text-sm">
                <span className="text-muted-foreground">الربح الإجمالي: </span>
                <span className="font-semibold">{formatCurrency(totalProfit)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ البدء</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 pr-4 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>اختر تاريخًا</span>
                            )}
                            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الانتهاء</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 pr-4 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>اختر تاريخًا</span>
                            )}
                            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < (form.getValues('startDate') || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {form.formState.isSubmitting
                  ? 'جارِ الحفظ...'
                  : 'حفظ المعاملة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
