

export type ContractStatus = 'active' | 'completed' | 'overdue' | 'archived';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'merchant';
  status: 'active' | 'inactive';
  lastSignInTime?: string;
};

export type Contract = {
  id: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  amount: number;
};

export type MurabahaContract = Contract & {
  type: 'murabaha';
  goods: string;
  units: number;
  purchasePrice: number;
  sellingPrice: number;
  paymentMethod: string;
  commodityCardId?: string;
};

export type MudarabahContract = Contract & {
  type: 'mudarabah';
  profitSharingRatio: {
    investor: number;
    manager: number;
  };
  capital: number;
  investmentArea: string;
};

export type MusharakahContract = Contract & {
  type: 'musharakah';
  partnerIds: string[];
  profitDistribution: string;
};

export type WakalahContract = Contract & {
  type: 'wakalah';
  agentName: string;
  agencyType: string;
  duration: string;
  feeStructure: string;
};

export type AnyContract = MurabahaContract | MudarabahContract | MusharakahContract | WakalahContract;

export type CommodityCard = {
  id: string;
  cardNumber: string;
  nominalValue: number;
  issuingBody: string;
  status: 'available' | 'in-use' | 'expired';
};

    