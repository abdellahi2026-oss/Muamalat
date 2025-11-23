
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
import { MoreHorizontal, Edit, Trash, CheckCircle } from 'lucide-react';
import type { AnyContract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { EditTransactionDialog } from './edit-transaction-dialog';

interface TransactionActionsProps {
  contract: AnyContract;
}

export function TransactionActions({ contract }: TransactionActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const getCollectionName = (type: AnyContract['type']) => {
    switch (type) {
      case 'murabaha': return 'murabahaContracts';
      case 'mudarabah': return 'mudarabahContracts';
      case 'musharakah': return 'musharakahContracts';
      case 'wakalah': return 'wakalahContracts';
    }
  };

  const handleComplete = async () => {
    if (!firestore || !user) return;
    const collectionName = getCollectionName(contract.type);
    const docRef = doc(firestore, 'clients', user.uid, collectionName, contract.id);
    try {
      await updateDoc(docRef, { status: 'completed' });
      toast({ title: 'تم إنهاء العقد بنجاح' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل إنهاء العقد: ' + error.message,
      });
    }
    setIsCompleteDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!firestore || !user) return;
    const collectionName = getCollectionName(contract.type);
    const docRef = doc(firestore, 'clients', user.uid, collectionName, contract.id);
    try {
      await deleteDoc(docRef);
      toast({ title: 'تم حذف العقد بنجاح' });
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
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>تعديل</span>
          </DropdownMenuItem>
          {contract.status !== 'completed' && (
             <DropdownMenuItem onSelect={() => setIsCompleteDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>إنهاء العقد</span>
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

      {/* Edit Dialog */}
      <EditTransactionDialog 
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        contract={contract}
      />

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من إنهاء العقد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى تغيير حالة العقد إلى "مكتمل". لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>تأكيد الإنهاء</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى حذف العقد بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
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
