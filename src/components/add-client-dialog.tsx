
'use client';

import { useState, useEffect } from 'react';
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
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Client } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'يجب أن يكون اسم الزبون حرفين على الأقل.' }),
  phone: z.string().min(1, { message: 'رقم الهاتف إجباري.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddOrEditClientDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    client?: Client | null;
    onSuccess?: () => void;
}

export function AddOrEditClientDialog({ isOpen, setIsOpen, client, onSuccess }: AddOrEditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  
  const isEditMode = !!client;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', phone: '' },
  });
  
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        form.reset({ name: client.name, phone: client.phone });
      } else {
        form.reset({ name: '', phone: '' });
      }
    }
  }, [isOpen, client, isEditMode, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    try {
        if (isEditMode) {
            const clientRef = doc(firestore, 'users', user.uid, 'clients', client.id);
            await updateDoc(clientRef, data);
            toast({ title: "تم تحديث الزبون بنجاح!" });
        } else {
            const newClientRef = doc(collection(firestore, 'users', user.uid, 'clients'));
            const newClient: Client = {
                id: newClientRef.id,
                name: data.name,
                phone: data.phone,
                totalDue: 0,
                createdAt: new Date().toISOString(),
                ownerId: user.uid,
            };
            await setDoc(newClientRef, newClient);
            toast({ title: "تمت إضافة الزبون بنجاح!" });
        }
        
        setIsOpen(false);
        if(onSuccess) onSuccess();

    } catch (error) {
        console.error("Error saving client: ", error);
        toast({ variant: 'destructive', title: "خطأ", description: "فشل حفظ الزبون." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل زبون' : 'إضافة زبون جديد'}</DialogTitle>
          <DialogDescription>
             {isEditMode ? 'قم بتحديث معلومات الزبون أدناه.' : 'أدخل تفاصيل الزبون الجديد لإضافته إلى قائمتك.'}
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
                  <FormLabel>اسم الزبون</FormLabel>
                  <FormControl><Input placeholder="الاسم الكامل للزبون" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>هاتف الزبون</FormLabel>
                  <FormControl><Input placeholder="رقم الهاتف" {...field} dir="ltr" /></FormControl>
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
