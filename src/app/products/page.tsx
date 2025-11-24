
'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Loader2, MoreHorizontal, Package, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AddOrEditProductDialog } from '@/components/add-edit-product-dialog';
import { useToast } from '@/hooks/use-toast';
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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

export default function ProductsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user?.uid]);

  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);
  
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteAlertOpen(true);
  };
  
  const confirmDelete = async () => {
      if (!firestore || !user || !productToDelete) return;
      const docRef = doc(firestore, 'users', user.uid, 'products', productToDelete.id);
      try {
          await deleteDoc(docRef);
          toast({ title: "تم حذف المنتج بنجاح" });
          setDeleteAlertOpen(false);
          setProductToDelete(null);
      } catch (e) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل حذف المنتج." });
      }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                المنتجات
            </h1>
            <p className="text-muted-foreground">
                إدارة المنتجات، الأسعار، والمخزون الخاص بك.
            </p>
        </div>
        <Button onClick={handleAddProduct}>
            <PlusCircle className="me-2" />
            إضافة منتج
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المنتجات</CardTitle>
          <CardDescription>
            جميع المنتجات المسجلة في نظامك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المنتج</TableHead>
                <TableHead>سعر الشراء</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>الكمية في المخزون</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              )}
               {!isLoading && error && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      حدث خطأ أثناء جلب البيانات.
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && products?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    لا توجد منتجات. انقر على "إضافة منتج" للبدء.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Package className="size-4 text-muted-foreground"/>
                    {product.name}
                  </TableCell>
                  <TableCell>{formatCurrency(product.purchasePrice)}</TableCell>
                  <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                  <TableCell className="font-medium">
                      {product.stock}
                  </TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                          <Edit className='me-2 size-4'/> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-red-500">
                           <Trash2 className='me-2 size-4'/> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
    <AddOrEditProductDialog 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        product={selectedProduct}
    />
    
    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج بشكل دائم.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                حذف
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
