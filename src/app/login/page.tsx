'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type AuthError,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { Logo } from '@/components/icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';


const formSchema = z.object({
  username: z.string().min(3, { message: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل.' }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const handlePasswordReset = async () => {
    const username = form.getValues('username');
    if (!username) {
        toast({
            variant: 'destructive',
            title: 'مطلوب اسم المستخدم',
            description: 'الرجاء إدخال اسم المستخدم الخاص بك أولاً.',
        });
        return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: 'فشل تهيئة Firebase'});
        return;
    }

    const email = username.includes('@') ? username : `${username}@muamalat.app`;

    try {
        await sendPasswordResetEmail(auth, email);
        toast({
            title: 'تم إرسال بريد إعادة التعيين',
            description: 'إذا كان الحساب موجودًا، فسيتم إرسال بريد إلكتروني لإعادة تعيين كلمة المرور.',
        });
    } catch (error) {
        // Show a generic message to avoid confirming if an email exists or not
        toast({
            title: 'تم إرسال بريد إعادة التعيين',
            description: 'إذا كان الحساب موجودًا، فسيتم إرسال بريد إلكتروني لإعادة تعيين كلمة المرور.',
        });
    }
  };


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'فشل تهيئة Firebase',
        description: 'خدمات Firebase غير متاحة. يرجى المحاولة مرة أخرى.',
      });
      return;
    }

    const email = data.username.includes('@') ? data.username : `${data.username}@muamalat.app`;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, data.password);
        const user = userCredential.user;

        // Ensure user document exists in Firestore with the correct role
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            const newUser: User = {
                id: user.uid,
                name: user.displayName || data.username,
                email: user.email!,
                role: email === 'admin@muamalat.app' ? 'admin' : 'merchant',
                status: 'active',
            };
            await setDoc(userDocRef, newUser);
        } else {
            // If doc exists, ensure admin role is set for the admin user, in case it was changed.
             if (email === 'admin@muamalat.app' && userDoc.data().role !== 'admin') {
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
            }
        }
        // Auth state change will handle the redirect via AppLayout.
    } catch (error) {
        const signInError = error as AuthError;
        
        let message = 'حدث خطأ غير متوقع.';
        switch (signInError.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
              message = 'كلمة المرور التي أدخلتها غير صحيحة.';
              break;
            case 'auth/too-many-requests':
            message = 'تم حظر الوصول مؤقتًا بسبب كثرة محاولات تسجيل الدخول الفاشلة.';
            break;
            case 'auth/network-request-failed':
            message = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
            break;
            default:
            message = signInError.message || 'فشلت محاولة تسجيل الدخول.';
            break;
        }
        toast({
            variant: 'destructive',
            title: 'فشل تسجيل الدخول',
            description: message,
        });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-4 text-primary">
          <Logo className="size-12" />
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            مدير المعاملات
          </h1>
      </div>
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل اسم المستخدم وكلمة المرور للوصول إلى حسابك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                      />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>كلمة المرور</FormLabel>
                       <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="inline-block text-sm underline"
                      >
                        هل نسيت كلمة المرور؟
                      </button>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} dir="ltr" className="text-left" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'جارِ المعالجة...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
