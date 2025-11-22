
'use client';

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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { useState } from 'react';
import { AddUserDialog } from '@/components/add-user-dialog';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useFirebase();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!firestore || !currentUser) return;
    // Prevent admin from deleting themselves
    if (userId === currentUser.uid) {
        toast({
            variant: 'destructive',
            title: 'لا يمكن حذف الحساب',
            description: 'لا يمكنك حذف حساب المدير الخاص بك.',
        });
        return;
    }

    if (window.confirm('هل أنت متأكد من أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({
                title: 'تم حذف المستخدم بنجاح',
            });
        } catch (error) {
            console.error("Error deleting user: ", error);
            toast({
                variant: 'destructive',
                title: 'خطأ في الحذف',
                description: 'حدث خطأ أثناء حذف المستخدم. يرجى المحاولة مرة أخرى.',
            });
        }
    }
  };


  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary">نشط</Badge>;
      case 'inactive':
        return <Badge variant="outline">غير نشط</Badge>;
    }
  };

  const getRoleName = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'merchant':
        return 'تاجر';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            إدارة المستخدمين
            </h1>
            <p className="text-muted-foreground">
            عرض وإدارة المستخدمين في النظام.
            </p>
        </div>
        <Button onClick={handleAddNew}>
            <PlusCircle className="me-2 h-4 w-4" />
            إضافة مستخدم
        </Button>
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
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">جارِ التحميل...</TableCell></TableRow>}
              {!isLoading && users?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">لا يوجد مستخدمون.</TableCell></TableRow>}
              {!isLoading && users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleName(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleEdit(user)}>تعديل</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDelete(user.id)} className="text-red-600">حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddUserDialog 
        isOpen={dialogOpen} 
        setIsOpen={setDialogOpen}
        editingUser={editingUser}
      />
    </div>
  );
}
