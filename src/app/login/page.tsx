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
  createUserWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';

const formSchema = z.object({
  username: z.string().min(3, { message: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل.' }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'فشل تهيئة Firebase',
        description: 'خدمات Firebase غير متاحة. يرجى المحاولة مرة أخرى.',
      });
      return;
    }

    const email = data.username.includes('@') ? data.username : `${data.username}@muamalat.app`;

    try {
      // The onAuthStateChanged listener in AppLayout will handle the redirect.
      await signInWithEmailAndPassword(auth, email, data.password);
    } catch (error) {
      const signInError = error as AuthError;
      
      // If admin user doesn't exist, create it.
      // The onAuthStateChanged listener in AppLayout will then handle the redirect after creation.
      if (signInError.code === 'auth/user-not-found' && email === 'admin@muamalat.app') {
        try {
          await createUserWithEmailAndPassword(auth, email, data.password);
          // IMPORTANT: Do NOT redirect here. The onAuthStateChanged listener will handle it.
        } catch (creationError) {
           const creationAuthError = creationError as AuthError;
          toast({
            variant: 'destructive',
            title: 'فشل إنشاء حساب المدير',
            description: creationAuthError.message || 'حدث خطأ أثناء محاولة إنشاء حساب المدير.',
          });
        }
        return; 
      }

      // Handle other sign-in errors
      let message = 'حدث خطأ غير متوقع.';
      switch (signInError.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
          message = 'كلمة مرور أو اسم مستخدم غير صحيح';
          break;
        case 'auth/too-many-requests':
          message = 'تم حظر الوصول مؤقتًا بسبب كثرة محاولات تسجيل الدخول الفاشلة.';
          break;
        case 'auth/network-request-failed':
          message = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
          break;
        default:
          message = signInError.message || 'كلمة مرور أو اسم مستخدم غير صحيح';
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
