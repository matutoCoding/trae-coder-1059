export type BillingRuleType = 'per_km' | 'per_hour' | 'flat';

export interface BillingRule {
  id: string;
  name: string;
  basePrice: number;
  baseDistance: number;
  pricePerKm: number;
  capPrice: number;
  capDistance: number;
  tempBonus?: number;
  tempPenalty?: number;
  effectiveDate: string;
  cargoTypes: string[];
}

export interface BillDetailItem {
  label: string;
  value: number;
  unit?: string;
  description?: string;
}

export interface Bill {
  id: string;
  billNo: string;
  orderId: string;
  orderNo: string;
  plateNumber: string;
  cargoName: string;
  actualDistance: number;
  actualDuration: number;
  baseAmount: number;
  distanceAmount: number;
  tempAdjustment: number;
  totalAmount: number;
  appliedRule: string;
  isStartPriceApplied: boolean;
  isCapPriceApplied: boolean;
  temperatureCompliance: number;
  createTime: string;
  status: 'pending' | 'paid' | 'overdue';
  details: BillDetailItem[];
}
