
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const profileFormSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون الاسم 3 أحرف على الأقل.' }),
  email: z.string().email(),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(6, { message: 'كلمة المرور الحالية مطلوبة.' }),
    newPassword: z.string().min(6, { message: 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.' }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمتا المرور الجديدتان غير متطابقتين.",
    path: ["confirmPassword"],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function SettingsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const auth = useAuth();

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: { name: '', email: '' }
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });

    useEffect(() => {
        if (userData) {
            profileForm.reset({
                name: userData.name,
                email: userData.email,
            });
        }
    }, [userData, profileForm]);

    const handleProfileUpdate: SubmitHandler<ProfileFormValues> = async (data) => {
        if (!userDocRef) return;
        try {
            await updateDoc(userDocRef, { name: data.name });
            toast({ title: 'تم تحديث الملف الشخصي بنجاح!' });
        } catch (error: any) {
            console.error("Error updating profile: ", error);
            toast({
                variant: 'destructive',
                title: 'خطأ في تحديث الملف الشخصي',
                description: error.message,
            });
        }
    };
    
    const handlePasswordUpdate: SubmitHandler<PasswordFormValues> = async (data) => {
        if (!user || !auth) return;
    
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
    
        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
            
            toast({ title: 'تم تغيير كلمة المرور بنجاح!' });
            passwordForm.reset();
        } catch (error: any) {
            console.error("Error updating password: ", error);
            let description = 'حدث خطأ غير متوقع.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = 'كلمة المرور الحالية التي أدخلتها غير صحيحة.';
            }
            toast({
                variant: 'destructive',
                title: 'فشل تغيير كلمة المرور',
                description,
            });
        }
    };


    const isLoading = isUserLoading || isUserDataLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <div className="space-y-6">
       <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground">
          إدارة إعدادات حسابك وتفضيلات التطبيق.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <h2 className="text-xl font-semibold">الملف الشخصي</h2>
            <p className="mt-1 text-sm text-muted-foreground">
                تحديث معلومات ملفك الشخصي.
            </p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardContent className="pt-6">
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                             <FormField
                                control={profileForm.control}
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
                                control={profileForm.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>البريد الإلكتروني</FormLabel>
                                    <FormControl>
                                    <Input {...field} readOnly disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                                {profileForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                حفظ التغييرات
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
      </div>

       <Separator />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <h2 className="text-xl font-semibold">كلمة المرور</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    تغيير كلمة المرور الخاصة بك.
                </p>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardContent className="pt-6">
                       <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>كلمة المرور الحالية</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} dir="ltr" className="text-left" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>كلمة المرور الجديدة</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} dir="ltr" className="text-left" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>تأكيد كلمة المرور الجديدة</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} dir="ltr" className="text-left" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                    {passwordForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    تغيير كلمة المرور
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>


    </div>
  );
}
