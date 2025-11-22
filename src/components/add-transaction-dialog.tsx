
'use client';

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useFirebase, useFirestore } from '@/firebase';

// Function to create the dynamic schema based on the contract type
const getFormSchema = (contractType: string) => {
    const baseSchema = z.object({
        clientName: z.string().min(3, { message: 'يجب أن يكون اسم العميل 3 أحرف على الأقل.' }),
        startDate: z.date({ required_error: 'يجب إدخال تاريخ البدء.' }),
        endDate: z.date({ required_error: 'يجب إدخال تاريخ الانتهاء.' }),
    });

    switch (contractType) {
        case 'murabaha':
            return baseSchema.extend({
                contractType: z.literal('murabaha'),
                goods: z.string().min(2, { message: 'يجب إدخال وصف للسلعة.' }),
                units: z.coerce.number().positive({ message: 'يجب أن تكون الكمية رقمًا موجبًا.' }),
                purchasePrice: z.coerce.number().positive({ message: 'يجب أن يكون سعر الشراء رقمًا موجبًا.' }),
                sellingPrice: z.coerce.number().positive({ message: 'يجب أن يكون سعر البيع رقمًا موجبًا.' }),
            }).refine((data) => data.sellingPrice > data.purchasePrice, {
                message: 'سعر البيع يجب أن يكون أكبر من سعر الشراء.',
                path: ['sellingPrice'],
            });
        case 'mudarabah':
            return baseSchema.extend({
                contractType: z.literal('mudarabah'),
                capital: z.coerce.number().positive({ message: 'يجب أن يكون رأس المال رقمًا موجبًا.' }),
                profitSharingRatio: z.coerce.number().min(1).max(99, { message: 'يجب أن تكون النسبة بين 1 و 99.' }),
                investmentArea: z.string().min(3, { message: 'يجب إدخال مجال الاستثمار.' }),
            });
        case 'musharakah':
            return baseSchema.extend({
                contractType: z.literal('musharakah'),
                amount: z.coerce.number().positive({ message: 'يجب أن يكون إجمالي المساهمة رقمًا موجبًا.' }),
                profitDistribution: z.string().min(3, { message: 'يجب توضيح كيفية توزيع الأرباح.' }),
            });
        case 'wakalah':
            return baseSchema.extend({
                contractType: z.literal('wakalah'),
                agentName: z.string().min(3, { message: 'يجب أن يكون اسم الوكيل 3 أحرف على الأقل.' }),
                amount: z.coerce.number().positive({ message: 'يجب أن تكون رسوم الوكالة رقمًا موجبًا.' }),
                agencyType: z.string().min(3, { message: 'يجب إدخال نوع الوكالة.' }),
            });
        default:
            return baseSchema.extend({
                contractType: z.enum(['murabaha', 'mudarabah', 'musharakah', 'wakalah']),
            });
    }
};


export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [contractType, setContractType] = useState<string>('murabaha');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useFirebase();

  const currentSchema = useMemo(() => getFormSchema(contractType), [contractType]);
  type FormValues = z.infer<typeof currentSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      contractType: 'murabaha',
      clientName: '',
      startDate: undefined,
      endDate: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن إضافة معاملة بدون تسجيل الدخول.',
      });
      return;
    }
    
    let collectionName: string;
    let contractData: any = {
        clientId: user.uid,
        status: 'active',
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
         clientName: data.clientName,
    };

    switch (data.contractType) {
        case 'murabaha':
            collectionName = 'murabahaContracts';
            contractData = {
                ...contractData,
                type: 'murabaha',
                goods: data.goods,
                units: data.units,
                purchasePrice: data.purchasePrice,
                sellingPrice: data.sellingPrice,
                amount: data.sellingPrice * data.units,
                paymentMethod: 'أقساط شهرية',
            };
            break;
        case 'mudarabah':
            collectionName = 'mudarabahContracts';
            contractData = {
                ...contractData,
                type: 'mudarabah',
                capital: data.capital,
                profitSharingRatio: { investor: 100 - data.profitSharingRatio, manager: data.profitSharingRatio },
                investmentArea: data.investmentArea,
                amount: data.capital,
            };
            break;
        case 'musharakah':
             const musharakahDocData = {
                partnerIds: [user.uid],
                profitDistribution: data.profitDistribution,
                status: 'active',
                startDate: data.startDate.toISOString(),
                endDate: data.endDate.toISOString(),
                clientName: data.clientName,
                amount: data.amount,
                type: 'musharakah',
            };
             try {
                await addDoc(collection(firestore, 'musharakahContracts'), musharakahDocData);
                toast({ title: 'تمت إضافة المعاملة بنجاح!', description: `تم إنشاء عقد مشاركة جديد لمشروع ${data.clientName}.` });
                setOpen(false);
                form.reset();
            } catch (error) {
                console.error('Error adding document: ', error);
                toast({ variant: 'destructive', title: 'حدث خطأ', description: 'لم نتمكن من حفظ المعاملة. يرجى المحاولة مرة أخرى.' });
            }
            return;
        case 'wakalah':
            collectionName = 'wakalahContracts';
            contractData = {
                ...contractData,
                type: 'wakalah',
                agentName: data.agentName,
                amount: data.amount,
                agencyType: data.agencyType,
                feeStructure: 'مبلغ مقطوع',
                duration: `${format(data.startDate, 'dd/MM/yy')} - ${format(data.endDate, 'dd/MM/yy')}`,
            };
            break;
    }


    try {
        await addDoc(collection(firestore, 'clients', user.uid, collectionName), contractData);

      toast({
        title: 'تمت إضافة المعاملة بنجاح!',
        description: `تم إنشاء عقد جديد لـ ${data.clientName}.`,
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
  
    const { units, purchasePrice, sellingPrice } = form.watch() as { units?: number; purchasePrice?: number; sellingPrice?: number };

    const totalProfit =
    units && purchasePrice && sellingPrice && units > 0 && purchasePrice > 0 && sellingPrice > 0
        ? (sellingPrice - purchasePrice) * units
        : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
    }).format(amount);
  };

  const handleContractTypeChange = (value: string) => {
    setContractType(value);
    form.reset({
        // @ts-ignore
        contractType: value,
        clientName: '',
        startDate: undefined,
        endDate: undefined,
    });
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
            اختر نوع العقد وأدخل التفاصيل.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            
            <FormItem>
                <FormLabel>نوع العقد</FormLabel>
                <Select onValueChange={handleContractTypeChange} value={contractType}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر نوع العقد" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="murabaha">مرابحة</SelectItem>
                        <SelectItem value="mudarabah">مضاربة</SelectItem>
                        <SelectItem value="musharakah">مشاركة</SelectItem>
                        <SelectItem value="wakalah">وكالة</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>


            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{contractType === 'musharakah' ? 'اسم المشروع' : 'اسم العميل'}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {contractType === 'murabaha' && (
              <>
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
              </>
            )}

            {contractType === 'mudarabah' && (
                <>
                    <FormField
                        control={form.control}
                        name="capital"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رأس المال</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="profitSharingRatio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>نسبة ربح المضارب (%)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="investmentArea"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>مجال الاستثمار</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
            
            {contractType === 'musharakah' && (
                <>
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>إجمالي المساهمة</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="profitDistribution"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>توزيع الأرباح</FormLabel>
                                <FormControl><Input placeholder="مثال: حسب نسبة رأس المال" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
            
            {contractType === 'wakalah' && (
                <>
                    <FormField
                        control={form.control}
                        name="agentName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>اسم الوكيل</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رسوم الوكالة</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="agencyType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>نوع الوكالة</FormLabel>
                                <FormControl><Input placeholder="مثال: وكالة خاصة لإدارة العقارات" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
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
