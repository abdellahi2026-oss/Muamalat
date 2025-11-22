export type ContractStatus = 'active' | 'completed' | 'overdue' | 'archived';

export type User = {
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'merchant';
};

export type Contract = {
  id: string;
  clientName: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
};

export type MurabahaContract = Contract & {
  type: 'murabaha';
  goods: string;
  units: number;
  price: number;
  paymentMethod: string;
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
  partnerContributions: { partner: string; amount: number }[];
  ownershipPercentages: { partner: string; percentage: number }[];
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
  purchasePrice?: number;
  sellingPrice?: number;
};
