
'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { PlusCircle, Calendar as CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useFirebase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Calendar } from './ui/calendar';
import { suggestCommodityCards, SuggestCommodityCardsOutput } from '@/ai/flows/commodity-card-suggestions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AnyContract, MurabahaContract, MudarabahContract, MusharakahContract, WakalahContract } from '@/lib/types';
import { Combobox } from './ui/combobox';

// A single, unified schema for all contract types.
// Fields specific to one contract type are marked as optional.
const formSchema = z.object({
  contractType: z.enum(['murabaha', 'mudarabah', 'musharakah', 'wakalah']),
  clientName: z.string().min(1, { message: 'يجب اختيار عميل أو إضافة عميل جديد.' }),
  newClientName: z.string().optional(),
  newClientPhone: z.string().optional(),
  startDate: z.date({ required_error: 'يجب إدخال تاريخ البدء.' }),
  endDate: z.date({ required_error: 'يجب إدخال تاريخ الانتهاء.' }),

  // Murabaha specific
  goods: z.string().optional(),
  units: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  commodityCardId: z.string().optional(),

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

}).refine(data => {
    if (data.clientName === 'new-client') {
        return !!data.newClientName && data.newClientName.length >= 3;
    }
    return true;
}, {
    message: 'يجب إدخال اسم العميل الجديد (3 أحرف على الأقل).',
    path: ['newClientName'],
})
.refine((data) => { // Conditional validation for Murabaha
    if (data.contractType === 'murabaha') {
        return (
            !!data.goods && data.goods.length >= 2 &&
            data.units !== undefined && data.units > 0 &&
            data.purchasePrice !== undefined && data.purchasePrice > 0 &&
            data.sellingPrice !== undefined && data.sellingPrice > data.purchasePrice
        );
    }
    return true;
}, {
    message: 'بيانات المرابحة غير كاملة. يجب أن يكون سعر البيع أعلى من سعر الشراء.',
    path: ['sellingPrice'], 
})
.refine(data => { // Conditional validation for Mudarabah
    if (data.contractType === 'mudarabah') {
        return (
            data.capital !== undefined && data.capital > 0 &&
            data.profitSharingRatio !== undefined && data.profitSharingRatio >= 1 && data.profitSharingRatio <= 99 &&
            !!data.investmentArea && data.investmentArea.length >= 3
        );
    }
    return true;
}, { message: "بيانات المضاربة غير كاملة أو غير صحيحة.", path: ["investmentArea"]})
.refine(data => { // Conditional validation for Musharakah
    if (data.contractType === 'musharakah') {
        return (
            data.amount !== undefined && data.amount > 0 &&
            !!data.profitDistribution && data.profitDistribution.length >= 3
        );
    }
    return true;
}, { message: "بيانات المشاركة غير كاملة أو غير صحيحة.", path: ["profitDistribution"]})
.refine(data => { // Conditional validation for Wakalah
    if (data.contractType === 'wakalah') {
        return (
            !!data.agentName && data.agentName.length >= 3 &&
            data.amount !== undefined && data.amount > 0 &&
            !!data.agencyType && data.agencyType.length >= 3
        );
    }
    return true;
}, { message: "بيانات الوكالة غير كاملة أو غير صحيحة.", path: ["agencyType"]});


type FormValues = z.infer<typeof formSchema>;


export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useFirebase();
  const [suggestions, setSuggestions] = useState<SuggestCommodityCardsOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractType: 'murabaha',
      clientName: '',
      startDate: undefined,
      endDate: undefined,
      goods: '',
      units: undefined,
      purchasePrice: undefined,
      sellingPrice: undefined,
      capital: undefined,
      profitSharingRatio: 50,
      investmentArea: '',
      amount: undefined,
      profitDistribution: '',
      agentName: '',
      agencyType: '',
    },
  });
  
  const contractType = form.watch('contractType');
  const selectedClient = form.watch('clientName');
  const { units, purchasePrice, goods, sellingPrice } = form.watch();

  const murabahaQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'murabahaContracts');
  }, [firestore, user?.uid]);
  const mudarabahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'mudarabahContracts');
  }, [firestore, user?.uid]);
  const musharakahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'musharakahContracts');
  }, [firestore, user?.uid]);
  const wakalahQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'clients', user.uid, 'wakalahContracts');
  }, [firestore, user?.uid]);

  const { data: murabahaContracts } = useCollection<MurabahaContract>(murabahaQuery);
  const { data: mudarabahContracts } = useCollection<MudarabahContract>(mudarabahQuery);
  const { data: musharakahContracts } = useCollection<MusharakahContract>(musharakahQuery);
  const { data: wakalahContracts } = useCollection<WakalahContract>(wakalahQuery);

  const clientOptions = useMemo(() => {
    const allContracts: AnyContract[] = [
        ...(murabahaContracts || []),
        ...(mudarabahContracts || []),
        ...(musharakahContracts || []),
        ...(wakalahContracts || []),
    ];

    const uniqueClients = [...new Set(allContracts.map(c => c.clientName).filter(Boolean))];
    const options = uniqueClients.map(client => ({
      value: client,
      label: client,
    }));

    // Add the "New Client" option
    options.unshift({ value: 'new-client', label: 'إضافة عميل جديد' });
    return options;
  }, [murabahaContracts, mudarabahContracts, musharakahContracts, wakalahContracts]);

  // Automatically fetch suggestions when inputs are valid
  useEffect(() => {
    const finalSellingPrice = sellingPrice || 0;
    if (contractType === 'murabaha' && units && purchasePrice && finalSellingPrice > purchasePrice && goods) {
        const handleGetSuggestions = async () => {
             const totalValue = finalSellingPrice * units;
             const contractDetails = `
                Goods: ${goods},
                Units: ${units},
                Purchase Price: ${purchasePrice},
                Selling Price: ${finalSellingPrice},
                Total Value: ${totalValue}
            `;

            if (!totalValue) return;

            setIsSuggesting(true);
            setSuggestions(null);
            try {
                const result = await suggestCommodityCards({
                    contractType: 'Murabaha',
                    contractDetails: contractDetails
                });
                setSuggestions(result);
            } catch (error) {
                console.error("Error getting suggestions:", error);
                toast({
                    variant: 'destructive',
                    title: 'فشل جلب الاقتراحات'
                });
            } finally {
                setIsSuggesting(false);
            }
        };

        handleGetSuggestions();
    }
  }, [units, purchasePrice, sellingPrice, goods, contractType, toast]);


  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن إضافة معاملة بدون تسجيل الدخول.',
      });
      return;
    }

    const finalClientName = data.clientName === 'new-client' ? data.newClientName : data.clientName;
    
    let collectionName: string;
    let contractData: any = {
        clientId: user.uid,
        status: 'active',
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        clientName: finalClientName,
        ...(data.clientName === 'new-client' && data.newClientPhone && { clientPhone: data.newClientPhone }),
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
                amount: (data.sellingPrice || 0) * (data.units || 0),
                paymentMethod: 'أقساط شهرية',
                ...(data.commodityCardId && { commodityCardId: data.commodityCardId }),
            };
            break;
        case 'mudarabah':
            collectionName = 'mudarabahContracts';
            contractData = {
                ...contractData,
                type: 'mudarabah',
                capital: data.capital,
                profitSharingRatio: { investor: 100 - (data.profitSharingRatio || 50), manager: data.profitSharingRatio || 50 },
                investmentArea: data.investmentArea,
                amount: data.capital,
            };
            break;
        case 'musharakah':
            collectionName = 'musharakahContracts';
            contractData = {
                ...contractData,
                partnerIds: [user.uid],
                profitDistribution: data.profitDistribution,
                amount: data.amount,
                type: 'musharakah',
            };
            break;
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
        const newDocRef = doc(collection(firestore, 'clients', user.uid, collectionName));
        await setDoc(newDocRef, {...contractData, id: newDocRef.id});

      toast({
        title: 'تمت إضافة المعاملة بنجاح!',
        description: `تم إنشاء عقد جديد لـ ${finalClientName}.`,
      });

      setOpen(false);
      form.reset();
      setSuggestions(null);
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
            اختر نوع العقد وأدخل التفاصيل.
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
                    <Select onValueChange={(value) => {
                        field.onChange(value as FormValues['contractType']);
                        setSuggestions(null); // Clear suggestions on type change
                        form.reset(); // Reset form to clear old values
                        form.setValue('contractType', value as FormValues['contractType']);
                    }} value={field.value}>
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
                )}
            />

            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{contractType === 'musharakah' ? 'اسم المشروع' : 'اسم العميل'}</FormLabel>
                   <Combobox
                        options={clientOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="ابحث عن عميل أو أضف جديد..."
                        notFoundText="لم يتم العثور على عميل."
                    />
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClient === 'new-client' && (
                <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/50 p-4">
                    <FormField
                        control={form.control}
                        name="newClientName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>اسم العميل الجديد</FormLabel>
                                <FormControl>
                                    <Input placeholder="الاسم الكامل للعميل" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="newClientPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>هاتف العميل</FormLabel>
                                <FormControl>
                                    <Input placeholder="اختياري" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}


            {contractType === 'murabaha' && (
              <>
                 <FormField
                    control={form.control}
                    name="goods"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>السلعة</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: أسمنت، حديد..." {...field} value={field.value || ''}/>
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
                 {(sellingPrice && units && purchasePrice) && (
                    <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted p-3 text-sm">
                        <div>
                            <span className="text-muted-foreground">إجمالي البيع: </span>
                            <span className="font-semibold">{formatCurrency(sellingPrice * units)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">الربح الإجمالي: </span>
                            <span className="font-semibold">{formatCurrency((sellingPrice - purchasePrice) * units)}</span>
                        </div>
                    </div>
                )}
                 
                 {(isSuggesting || suggestions) && (
                  <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                      <h4 className="font-medium flex items-center">
                          <Wand2 className="w-4 h-4 me-2 text-primary" />
                          اقتراحات البطاقات السلعية
                      </h4>
                      {isSuggesting && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جارِ البحث عن أفضل البطاقات...</span>
                          </div>
                      )}
                      {suggestions && (
                           <Alert>
                            <AlertTitle className='font-bold'>البطاقات المقترحة:</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside mt-2">
                                {suggestions.suggestedCards.map((card, idx) => (
                                    <li key={idx}>{card}</li>
                                ))}
                                </ul>
                                <p className="mt-2 text-xs italic">{suggestions.reasoning}</p>
                            </AlertDescription>
                            </Alert>
                      )}
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
                    <Popover modal={true}>
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
                    <Popover modal={true}>
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
               <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
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


    