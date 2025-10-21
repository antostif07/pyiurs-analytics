export interface FinancialReport {
  reportDate: string;
  totalBalance: number;
  monthlyFlow: number;
  transactions: FundTransaction[];
  policy: {
    beautyRevenue: number;
    allowedOperations: string[];
    otherRevenue: number;
  };
  allocations: {
    merchandise: string[];
    reserves: string[];
  };
  productBreakdown: {
    P24: number;
    PMTO: number;
    RKTAI: number;
    PLMBI: number;
    PGNL: number;
  };
}

export interface FundTransaction {
  id: number;
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  category: string;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  balanceAfter: number;
  agent: string;
  location: string;
}