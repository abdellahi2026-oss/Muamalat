
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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import type { User } from '@/lib/types';


const formSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل.' }),
  email: z.string().email({ message: 'الرجاء إدخال بريد إلكتروني صالح.' }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
});

type FormValues = z.infer<typeof formSchema>;


export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'خدمة Firestore غير متاحة.',
      });
      return;
    }
    
    // We need a separate auth instance for user creation
    const auth = getAuth();

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Create user document in Firestore
      const newUser: User = {
        id: user.uid,
        name: data.name,
        email: data.email,
        role: 'merchant', // All new users are merchants by default
        status: 'active',
      };
      
      await setDoc(doc(firestore, 'users', user.uid), newUser);

      toast({
        title: 'تم إنشاء المستخدم بنجاح!',
        description: `تم إنشاء حساب جديد لـ ${data.name}.`,
      });

      setOpen(false);
      form.reset();

    } catch (error: any) {
      console.error('Error creating user: ', error);
      let description = 'لم نتمكن من إنشاء المستخدم. يرجى المحاولة مرة أخرى.';
      if (error.code === 'auth/email-already-in-use') {
          description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
      }
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: description,
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <PlusCircle className="me-2" />
          إضافة مستخدم
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المستخدم الجديد لإنشاء حسابه.
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
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أحمد محمود" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} dir="ltr" className="text-left" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} dir="ltr" className="text-left" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {form.formState.isSubmitting
                  ? 'جارِ الإنشاء...'
                  : 'إنشاء مستخدم'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
