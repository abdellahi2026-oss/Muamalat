
export type ContractStatus = 'active' | 'completed' | 'overdue' | 'archived';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'merchant';
  status: 'active' | 'inactive';
  lastSignInTime?: string;
};

// Represents a client (customer)
export type Client = {
    id: string;
    name: string;
    phone: string;
    totalDue: number; // Aggregated amount from all their active contracts
    createdAt: string;
    ownerId: string;
};

// Represents a product the merchant sells
export type Product = {
    id: string;
    name: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    ownerId: string;
}

// Represents a single transaction or contract (Murabaha)
export type Transaction = {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for easy display
  productId: string;
  productName: string; // Denormalized for easy display
  
  quantity: number;
  purchasePrice: number; // At the time of transaction
  sellingPrice: number; // At the time of transaction

  totalAmount: number; // quantity * sellingPrice
  profit: number; // (sellingPrice - purchasePrice) * quantity
  
  issueDate: string;
  dueDate: string;
  
  status: ContractStatus;
  
  paidAmount: number;
  remainingAmount: number;

  ownerId: string;
};

// This will be the only contract type for now to follow the new specs.
export type AnyContract = Transaction;
