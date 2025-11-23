
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddUserDialog } from '@/components/add-user-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: currentUserData, isLoading: isCurrentUserLoading } = useDoc<User>(userDocRef);

  const [updatingUsers, setUpdatingUsers] = useState<string[]>([]);
  
  const usersQuery = useMemoFirebase(() => {
    // Only create the query if the current user is an admin.
    // The useCollection hook will handle the case where the query is null.
    if (!firestore || currentUserData?.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, currentUserData]);

  const { data: users, isLoading: areUsersLoading, error: usersError } = useCollection<User>(usersQuery);

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    if (!firestore) return;
    setUpdatingUsers(prev => [...prev, userId]);
    try {
      const userDocRefToUpdate = doc(firestore, 'users', userId);
      await updateDoc(userDocRefToUpdate, updates);
      toast({
        title: 'تم تحديث المستخدم بنجاح',
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل تحديث المستخدم. يرجى التحقق من قواعد الأمان.',
      });
    } finally {
        setUpdatingUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant='secondary'>نشط</Badge>;
      case 'inactive':
        return <Badge variant='destructive'>غير نشط</Badge>;
    }
  };
  
    const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant='default'>مدير</Badge>;
      case 'merchant':
        return <Badge variant='outline'>تاجر</Badge>;
    }
  };

  const formatLastSignIn = (dateString?: string) => {
    if (!dateString) return 'لم يسجل دخوله بعد';
    try {
        const date = new Date(dateString);
        // if date is more than a week ago, show full date, otherwise show relative time
        if (Date.now() - date.getTime() > 7 * 24 * 60 * 60 * 1000) {
            return format(date, 'd MMMM yyyy', { locale: ar });
        }
        return formatDistanceToNow(date, { addSuffix: true, locale: ar });
    } catch (error) {
        return 'تاريخ غير صالح';
    }
  };

  const isLoading = isUserLoading || isCurrentUserLoading;
  const isDataReady = !isLoading;
  const isAdmin = currentUserData?.role === 'admin';

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (isDataReady && !isAdmin) {
      return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>وصول مرفوض</AlertTitle>
            <AlertDescription>
                ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.
            </AlertDescription>
         </Alert>
      )
  }

  // Render the page for the admin
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            إدارة المستخدمين
            </h1>
            <p className="text-muted-foreground">
            عرض وإدارة حسابات المستخدمين في النظام.
            </p>
        </div>
        <AddUserDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>
            جميع المستخدمين المسجلين في النظام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر تسجيل دخول</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areUsersLoading && <TableRow><TableCell colSpan={6} className="text-center">جارِ التحميل...</TableCell></TableRow>}
              {!areUsersLoading && usersError && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center text-destructive">
                      خطأ في جلب المستخدمين. قد لا تكون لديك الصلاحيات اللازمة.
                    </TableCell>
                </TableRow>
              )}
              {!areUsersLoading && !usersError && users?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center">لا يوجد مستخدمون.</TableCell></TableRow>}
              {!areUsersLoading && !usersError && users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="text-left" dir="ltr">{u.email}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>{getStatusBadge(u.status)}</TableCell>
                  <TableCell>{formatLastSignIn(u.lastSignInTime)}</TableCell>
                  <TableCell className="text-left">
                    {updatingUsers.includes(u.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin ms-auto" />
                    ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={u.email === 'admin@muamalat.app'}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateUser(u.id, { role: u.role === 'admin' ? 'merchant' : 'admin' })}>
                          {u.role === 'admin' ? 'تعيين كتاجر' : 'تعيين كمدير'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' })}>
                          {u.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
