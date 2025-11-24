
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, CheckCircle, Undo2, Ban } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
// import { EditTransactionDialog } from './edit-transaction-dialog'; // This will need to be created/refactored

interface TransactionActionsProps {
  transaction: Transaction;
}

export function TransactionActions({ transaction }: TransactionActionsProps) {
  // const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const handleStatusChange = async (newStatus: 'completed' | 'active') => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
    try {
      await updateDoc(docRef, { status: newStatus });
      toast({ title: `تم تغيير حالة العقد إلى "${newStatus === 'completed' ? 'مكتمل' : 'نشط'}"` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل تحديث حالة العقد: ' + error.message,
      });
    }
    setIsCompleteDialogOpen(false);
    setIsReopenDialogOpen(false);
  };


  const handleDelete = async () => {
    if (!firestore || !user) return;
    
    const batch = writeBatch(firestore);
    
    // 1. Reference to the transaction to be deleted
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
    batch.delete(transactionRef);

    // 2. Reference to the product to update its stock
    const productRef = doc(firestore, 'users', user.uid, 'products', transaction.productId);
    // Add the quantity back to the stock
    batch.update(productRef, { 'stock': transaction.quantity });

    // 3. Reference to the client to update their totalDue
    const clientRef = doc(firestore, 'users', user.uid, 'clients', transaction.clientId);
    // Subtract the transaction amount from the client's total due
    batch.update(clientRef, { 'totalDue': -transaction.totalAmount });


    try {
      await batch.commit();
      toast({ title: 'تم حذف العقد بنجاح وأعيدت الكمية للمخزون.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل حذف العقد: ' + error.message,
      });
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">فتح القائمة</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>تعديل</span>
          </DropdownMenuItem> */}
          {transaction.status === 'active' && (
             <DropdownMenuItem onSelect={() => setIsCompleteDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>إنهاء العقد</span>
            </DropdownMenuItem>
          )}
          {transaction.status === 'completed' && (
             <DropdownMenuItem onSelect={() => setIsReopenDialogOpen(true)}>
                <Undo2 className="mr-2 h-4 w-4" />
                <span>إعادة فتح العقد</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onSelect={() => setIsDeleteDialogOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>حذف</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog - To be implemented
      <EditTransactionDialog 
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        transaction={transaction}
      /> */}

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من إنهاء العقد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى تغيير حالة العقد إلى "مكتمل".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('completed')}>تأكيد الإنهاء</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       {/* Re-open Confirmation Dialog */}
      <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من إعادة فتح العقد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى تغيير حالة العقد إلى "نشط".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('active')}>تأكيد إعادة الفتح</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى حذف العقد بشكل دائم وإعادة الكمية إلى المخزون. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
