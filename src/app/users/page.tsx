
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
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: currentUserData, isLoading: isCurrentUserLoading } = useDoc<User>(userDocRef);

  const [updatingUsers, setUpdatingUsers] = useState<string[]>([]);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  useEffect(() => {
    const isDataLoading = isUserLoading || isCurrentUserLoading;
    if (!isDataLoading && currentUserData?.role !== 'admin') {
      router.push('/');
    }
  }, [currentUserData, isUserLoading, isCurrentUserLoading, router]);

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

  const isLoading = isUserLoading || isCurrentUserLoading || areUsersLoading;

  if (isLoading || currentUserData?.role !== 'admin') {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          إدارة المستخدمين
        </h1>
        <p className="text-muted-foreground">
          عرض وإدارة حسابات المستخدمين في النظام.
        </p>
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
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && users?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">لا يوجد مستخدمون.</TableCell></TableRow>}
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>{getStatusBadge(u.status)}</TableCell>
                  <TableCell className="text-right">
                    {updatingUsers.includes(u.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin ms-auto" />
                    ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={u.id === user?.uid}>
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
