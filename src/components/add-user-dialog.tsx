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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import type { User } from '@/lib/types';
// Note: We can't actually create a Firebase Auth user from the client-side like this
// without admin privileges. This dialog will only manage the user's profile in Firestore.
// The auth user would need to be created separately (e.g. via a server-side function).

const formSchema = z.object({
  name: z.string().min(2, { message: 'يجب أن يكون الاسم حرفين على الأقل.' }),
  email: z.string().email({ message: 'الرجاء إدخال بريد إلكتروني صالح.' }),
  password: z.string().optional(),
  role: z.enum(['admin', 'merchant'], { required_error: 'الرجاء اختيار دور.' }),
  status: z.enum(['active', 'inactive'], { required_error: 'الرجاء اختيار حالة.' }),
});

// We need a conditional schema for editing vs creating
const userFormSchema = formSchema
  .extend({
    id: z.string().optional(), // ID is optional, present only when editing
  })
  .superRefine((data, ctx) => {
    // Password is required and must be at least 6 chars long only when CREATING a new user (no id)
    if (!data.id && (!data.password || data.password.length < 6)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'كلمة المرور مطلوبة ويجب أن تكون 6 أحرف على الأقل.',
        path: ['password'],
      });
    }
  });


type FormValues = z.infer<typeof userFormSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingUser: User | null;
}

export function AddUserDialog({ isOpen, setIsOpen, editingUser }: AddUserDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const isEditing = !!editingUser;

  const form = useForm<FormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'merchant',
      status: 'active',
    },
  });
  
  useEffect(() => {
    if (isEditing && editingUser) {
      form.reset({
        id: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
        password: '',
      });
    } else {
      form.reset({
        id: undefined,
        name: '',
        email: '',
        password: '',
        role: 'merchant',
        status: 'active',
      });
    }
  }, [editingUser, isEditing, form, isOpen]);


  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;

    const userData: Omit<User, 'id'> & {id?: string} = {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
    };
    
    try {
        if (isEditing && editingUser) {
            // Update existing user profile in Firestore
            const userRef = doc(firestore, 'users', editingUser.id);
            await setDoc(userRef, userData, { merge: true });
            toast({ title: 'تم تحديث المستخدم بنجاح!' });
        } else {
            // This is a placeholder. In a real app, you'd use a server-side function
            // to create the Auth user and the Firestore document in a transaction.
            // For now, we'll show a warning that this is not a real user creation.
            
            // We'll simulate creating the user doc for the UI.
            // We can't create the auth user here, so we will just create the firestore doc
            // and assume the admin will create the auth user separately.
            const newId = doc(collection(firestore, 'users')).id;
            await setDoc(doc(firestore, 'users', newId), { ...userData, id: newId });

            toast({
                title: 'تم إنشاء ملف المستخدم بنجاح!',
                description: 'ملاحظة: لم يتم إنشاء حساب مصادقة. يجب إنشاؤه بشكل منفصل.',
            });
        }
        setIsOpen(false);
    } catch (error: any) {
        console.error('Error saving user: ', error);
        toast({
            variant: 'destructive',
            title: 'حدث خطأ',
            description: error.message || 'لم نتمكن من حفظ المستخدم. يرجى المحاولة مرة أخرى.',
        });
    }
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'قم بتحديث تفاصيل المستخدم أدناه.' : 'أدخل تفاصيل المستخدم الجديد.'}
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
                  <FormLabel>الاسم</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} type="email" readOnly={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {!isEditing && (
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>كلمة المرور</FormLabel>
                        <FormControl>
                            <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>الدور</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="اختر دورًا" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="merchant">تاجر</SelectItem>
                              <SelectItem value="admin">مدير</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>الحالة</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="اختر حالة" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="active">نشط</SelectItem>
                              <SelectItem value="inactive">غير نشط</SelectItem>
                          </SelectContent>
                      </Select>
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
                  : 'حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
