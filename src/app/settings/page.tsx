
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
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
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">الاسم</Label>
                            <Input id="name" defaultValue="أحمد محمود" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="email">البريد الإلكتروني</Label>
                            <Input id="email" type="email" defaultValue="ahmed.mahmoud@example.com" />
                        </div>
                         <Button>حفظ التغييرات</Button>
                    </form>
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
                        <form className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                                <Input id="current-password" type="password" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                                <Input id="new-password" type="password" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
                                <Input id="confirm-password" type="password" />
                            </div>
                             <Button>تغيير كلمة المرور</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>


    </div>
  );
}
