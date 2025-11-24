
'use client';

import { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'يجب أن يكون اسم المنتج حرفين على الأقل.' }),
  purchasePrice: z.coerce.number().min(0, { message: 'سعر الشراء يجب أن يكون رقمًا موجبًا.' }),
  sellingPrice: z.coerce.number().min(0, { message: 'سعر البيع يجب أن يكون رقمًا موجبًا.' }),
  stock: z.coerce.number().int({ message: 'الكمية يجب أن تكون رقمًا صحيحًا.' }).min(0),
}).refine(data => data.sellingPrice > data.purchasePrice, {
    message: "سعر البيع يجب أن يكون أعلى من سعر الشراء.",
    path: ['sellingPrice'],
});

type FormValues = z.infer<typeof formSchema>;

interface AddOrEditProductDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    product: Product | null;
}

export function AddOrEditProductDialog({ isOpen, setIsOpen, product }: AddOrEditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', purchasePrice: 0, sellingPrice: 0, stock: 0 },
  });

  useEffect(() => {
    if (product) {
      form.reset(product);
    } else {
      form.reset({ name: '', purchasePrice: 0, sellingPrice: 0, stock: 0 });
    }
  }, [product, isOpen, form]);
  
  const isEditMode = !!product;

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    try {
        if (isEditMode) {
            const docRef = doc(firestore, 'users', user.uid, 'products', product.id);
            await updateDoc(docRef, data);
            toast({ title: "تم تحديث المنتج بنجاح!" });
        } else {
            const collectionRef = collection(firestore, 'users', user.uid, 'products');
            const newDocRef = doc(collectionRef);
            const newProductData: Product = {
                id: newDocRef.id,
                ownerId: user.uid,
                ...data
            };
            await setDoc(newDocRef, newProductData);
            toast({ title: "تمت إضافة المنتج بنجاح!" });
        }
        setIsOpen(false);
    } catch (error) {
        console.error("Error saving product: ", error);
        toast({ variant: 'destructive', title: "خطأ", description: "فشل حفظ المنتج." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'قم بتحديث تفاصيل المنتج أدناه.' : 'أدخل تفاصيل المنتج الجديد لإضافته للمخزون.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المنتج</FormLabel>
                  <FormControl><Input placeholder="مثال: أسمنت، سكر..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
                <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>سعر الشراء</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>سعر البيع (آجل)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الكمية في المخزون</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'جارِ الحفظ...' : 'حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
