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
  type AuthError,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const formSchema = z.object({
  username: z.string().min(3, { message: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل.' }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      if (!auth || !firestore) {
         toast({
          variant: 'destructive',
          title: 'فشل تهيئة Firebase',
          description: 'خدمات Firebase غير متاحة. يرجى المحاولة مرة أخرى.',
        });
        return;
      }

      let email: string;

      // Handle admin login directly
      if (data.username.toLowerCase() === 'admin') {
        email = 'admin@muamalat.app';
      } else {
        // For other users, find their email from Firestore
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('username', '==', data.username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast({
            variant: 'destructive',
            title: 'فشل تسجيل الدخول',
            description: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
          });
          return;
        }
        
        const userDoc = querySnapshot.docs[0];
        email = userDoc.data().email;

        if (!email) {
          toast({
            variant: 'destructive',
            title: 'فشل تسجيل الدخول',
            description: 'لم يتم العثور على بريد إلكتروني مرتبط باسم المستخدم هذا.',
          });
          return;
        }
      }

      await signInWithEmailAndPassword(auth, email, data.password);
      
      toast({
        title: 'تم تسجيل الدخول بنجاح!',
        description: 'أهلاً بعودتك.',
      });
      router.push('/');

    } catch (error) {
      console.error("Login Error:", error);
      let message = 'حدث خطأ غير متوقع.';
      const firebaseError = error as AuthError;

      if (firebaseError.code) {
        switch (firebaseError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            message = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
            break;
          case 'auth/too-many-requests':
            message = 'تم حظر الوصول مؤقتًا بسبب كثرة محاولات تسجيل الدخول الفاشلة.';
            break;
          case 'auth/network-request-failed':
            message = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
            break;
           case 'auth/configuration-not-found':
             message = 'فشل العثور على إعدادات Firebase. يرجى التأكد من صحة الإعدادات.';
             break;
          default:
            message = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
            break;
        }
      }
      
      toast({
        variant: 'destructive',
        title: 'فشل تسجيل الدخول',
        description: message,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل اسم المستخدم وكلمة المرور للوصول إلى حسابك
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
                    <div className="flex items-center">
                      <FormLabel>كلمة المرور</FormLabel>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'جارِ تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
