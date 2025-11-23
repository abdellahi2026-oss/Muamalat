
'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Calendar } from './ui/calendar';
import type { AnyContract, MudarabahContract, MurabahaContract } from '@/lib/types';


const formSchema = z.object({
  contractType: z.enum(['murabaha', 'mudarabah', 'musharakah', 'wakalah']),
  clientName: z.string().min(3, { message: 'يجب أن يكون اسم العميل 3 أحرف على الأقل.' }),
  startDate: z.date({ required_error: 'يجب إدخال تاريخ البدء.' }),
  endDate: z.date({ required_error: 'يجب إدخال تاريخ الانتهاء.' }),

  // Murabaha specific
  goods: z.string().optional(),
  units: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),

  // Mudarabah specific
  capital: z.coerce.number().optional(),
  profitSharingRatio: z.coerce.number().optional(),
  investmentArea: z.string().optional(),

  // Musharakah & Wakalah specific
  amount: z.coerce.number().optional(),

  // Musharakah specific
  profitDistribution: z.string().optional(),
  
  // Wakalah specific
  agentName: z.string().optional(),
  agencyType: z.string().optional(),
});


type FormValues = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    contract: AnyContract;
}


export function EditTransactionDialog({ isOpen, setIsOpen, contract }: EditTransactionDialogProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const defaultValues = useMemo(() => {
    const mudarabahRatio = contract.type === 'mudarabah' ? (contract as MudarabahContract).profitSharingRatio.manager : 50;
    
    return {
        ...contract,
        contractType: contract.type,
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        profitSharingRatio: mudarabahRatio,
    };
  }, [contract]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });
  
  const { units, purchasePrice, sellingPrice } = form.watch();

  // When the dialog is opened with a new contract, reset the form
  useEffect(() => {
    if (isOpen) {
        const mudarabahRatio = contract.type === 'mudarabah' ? (contract as MudarabahContract).profitSharingRatio.manager : 50;
        
        form.reset({
            ...contract,
            contractType: contract.type,
            startDate: new Date(contract.startDate),
            endDate: new Date(contract.endDate),
            profitSharingRatio: mudarabahRatio,
        });
    }
  }, [isOpen, contract, form]);
  
  const contractType = form.watch('contractType');

  const getCollectionName = (type: AnyContract['type']) => {
    switch (type) {
      case 'murabaha': return 'murabahaContracts';
      case 'mudarabah': return 'mudarabahContracts';
      case 'musharakah': return 'musharakahContracts';
      case 'wakalah': return 'wakalahContracts';
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن تعديل المعاملة بدون تسجيل الدخول.',
      });
      return;
    }
    
    const collectionName = getCollectionName(contract.type);
    const docRef = doc(firestore, 'clients', user.uid, collectionName, contract.id);
    
    let updatedData: Partial<AnyContract> = {
        clientName: data.clientName,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
    };

    switch (data.contractType) {
        case 'murabaha':
            updatedData = {
                ...updatedData,
                goods: data.goods,
                units: data.units,
                purchasePrice: data.purchasePrice,
                sellingPrice: data.sellingPrice,
                amount: (data.sellingPrice || 0) * (data.units || 0),
            };
            break;
        case 'mudarabah':
            updatedData = {
                ...updatedData,
                capital: data.capital,
                profitSharingRatio: { investor: 100 - (data.profitSharingRatio || 50), manager: data.profitSharingRatio || 50 },
                investmentArea: data.investmentArea,
                amount: data.capital,
            };
            break;
        case 'musharakah':
             updatedData = {
                ...updatedData,
                profitDistribution: data.profitDistribution,
                amount: data.amount,
            };
            break;
        case 'wakalah':
            updatedData = {
                ...updatedData,
                agentName: data.agentName,
                amount: data.amount,
                agencyType: data.agencyType,
                 duration: `${format(data.startDate, 'dd/MM/yy')} - ${format(data.endDate, 'dd/MM/yy')}`,
            };
            break;
    }

    try {
      await updateDoc(docRef, updatedData);
      toast({
        title: 'تم تعديل المعاملة بنجاح!',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating document: ', error);
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من حفظ التعديلات. يرجى المحاولة مرة أخرى.',
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>تعديل المعاملة</DialogTitle>
          <DialogDescription>
            قم بتحديث تفاصيل العقد أدناه.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            
            <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>نوع العقد</FormLabel>
                     <Input value={field.value} readOnly disabled />
                    <FormMessage />
                </FormItem>
                )}
            />

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
                            <Input placeholder="مثال: أسمنت، حديد..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الكمية</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سعر الشراء</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || ''} />
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
                        <FormLabel>سعر البيع</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                                <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input placeholder="مثال: حسب نسبة رأس المال" {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
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
                                <FormControl><Input placeholder="مثال: وكالة خاصة لإدارة العقارات" {...field} value={field.value || ''} /></FormControl>
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
               <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {form.formState.isSubmitting
                  ? 'جارِ الحفظ...'
                  : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
