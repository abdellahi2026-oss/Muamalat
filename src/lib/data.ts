

import { CommodityCard } from './types';

// This data is now fetched from Firestore, so this static array is no longer needed.
// export const allUsers: User[] = [
//   { id: 'usr_001', name: 'أحمد محمود', email: 'ahmed.mahmoud@example.com', role: 'admin', status: 'active' },
//   { id: 'usr_002', name: 'فاطمة علي', email: 'fatima.ali@example.com', role: 'merchant', status: 'active' },
//   { id: 'usr_003', name: 'خالد حسين', email: 'khaled.hussain@example.com', role: 'merchant', status: 'inactive' },
//   { id: 'usr_004', name: 'مريم يوسف', email: 'mariam.youssef@example.com', role: 'merchant', status: 'active' },
// ];

export const commodityCards: CommodityCard[] = [
    {
      id: 'C001',
      cardNumber: '1234-5678-9012-3456',
      nominalValue: 10000,
      issuingBody: 'بنك البركة',
      status: 'available',
    },
    {
      id: 'C002',
      cardNumber: '2345-6789-0123-4567',
      nominalValue: 50000,
      issuingBody: 'مصرف الراجحي',
      status: 'in-use',
    },
    {
      id: 'C003',
      cardNumber: '3456-7890-1234-5678',
      nominalValue: 25000,
      issuingBody: 'بنك دبي الإسلامي',
      status: 'available',
    },
    {
      id: 'C004',
      cardNumber: '4567-8901-2345-6789',
      nominalValue: 100000,
      issuingBody: 'بنك أبوظبي الإسلامي',
      status: 'expired',
    },
];
